# Example smell-audit output (calibration reference, not a real audit)

This file is a generic calibration example for the `smell-audit` skill — it shows the expected
structure, depth, and tone of a real audit's output. It is **not** a review of any actual
codebase; the file names and code below are illustrative placeholders. Do not copy its content
into a real audit — use it only to calibrate how much explanation, verification, and mechanical
detail each section of a real audit should contain.

---

## Background: the principles referenced

- **Fowler** — Martin Fowler, _Refactoring: Improving the Design of Existing Code_ (2nd ed.,
  2018). A catalogue of "code smells" — surface symptoms of a design problem — paired with
  named, mechanical "refactorings" that remove them without changing observable behaviour.

- **Freeman & Pryce** — Steve Freeman & Nat Pryce, _Growing Object-Oriented Software, Guided
  by Tests_ (2012, "GOOS"). Central claim: tests are a design tool. When a test is hard to
  write, awkward to read, or needs a wall of setup, that's _feedback_ about the production
  design, not just a testing inconvenience.

- **SOLID** — five principles of object-oriented design (Robert C. Martin): Single
  Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency
  Inversion — each named and briefly defined the first time it's invoked below.

---

## The smells

### Smell N: `formatOrderSummary` builds a string by reaching into three collaborators' internals

**Where:** `billing/summary.js:40-72` — `formatOrderSummary(order)` reads
`order.customer.address.postcode`, iterates `order.lines[i].product.price.cents`, and calls
`order.discount.policy.describe()` directly, rather than asking `order`, `customer`, or `line`
a question.

**Verified:** traced each of the three chains to confirm they're live production paths, not
dead code — `formatOrderSummary` is called from `billing/invoice.js:18` on every invoice render,
and all three chains are exercised by `tests/billing/summary.test.js`.

**Why it's bad:**

- **Freeman & Pryce — Tell, Don't Ask**: pulling data out of an object to make a decision
  outside it (here, "how do I describe this order") is the inverse of telling the object what
  you want. Each of these three-deep chains is a missed message send.
- **Fowler — Message Chains**: `order.lines[i].product.price.cents` is a textbook message
  chain — the caller is coupled to the exact internal navigation path through `Order`,
  `Line`, `Product`, and `Price`, so any of those four classes changing its internal shape
  breaks a caller two files away that has nothing to do with them.
- **SOLID — Single Responsibility**: `formatOrderSummary` has taken on responsibility for
  knowing the internal structure of `Order`, `Customer`, `Line`, and `Discount` simultaneously,
  when its actual job is "produce a string."

**The refactoring:** **Hide Delegate** on each chain, then **Extract Function** to push the
knowledge back into the owning class.

1. Add `order.customerPostcode()` to `Order`, forwarding to `this.customer.address.postcode`.
2. Add `line.priceInCents()` to `Line`, forwarding to `this.product.price.cents`.
3. Add `order.discountDescription()` to `Order`, forwarding to
   `this.discount.policy.describe()`.
4. Update `formatOrderSummary` to call the three new methods instead of the chains; run tests
   after each step, not just at the end.
5. Once no caller reaches through `order.lines[i].product...` anywhere else in the codebase,
   consider whether `Product` and `Price` need to be reachable from `Line` at all outside
   `Line` itself.

---

## Suggested order of work

State the order explicitly and justify each placement in terms of what it makes cheaper or
unnecessary later — for example: "Do the parameter-list cleanup in `formatOrderSummary` (Smell
N) before extracting the shared `Money` value object (Smell N+2), because the delegate methods
added in step 1 are the natural home for the `Money` object's construction, so building `Money`
first would mean revisiting `Order`/`Line` a second time once the delegates exist." A fix order
that isn't justified this way is just a list — the justification is what makes it "least total
work" rather than an arbitrary sequence.
