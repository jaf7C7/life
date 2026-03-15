# These tests must be run with `shtest <this_file>`
# https://github.com/jaf7C7/shtest-2

test_prints_warning_if_summary_message_is_longer_than_50_chars_but_less_than_72 () {
	file=$(mktemp)
	cat >"$file" <<EOF
This is a long summary message which is exactly 62 characters.
EOF
	expected_msg="\
commit message longer than 50 chars, consider amending"

	assert_equal "$expected_msg" "$(./commit-msg "$file")"

	rm "$file"
}

test_returns_0_if_summary_message_is_longer_than_50_chars_but_less_than_72 () {
	file=$(mktemp)
	cat >"$file" <<EOF
This is a long summary message which is exactly 62 characters.
EOF
	./commit-msg "$file"

	assert_equal 0 $?

	rm "$file"
}

test_prints_error_message_if_summary_message_is_longer_than_72_chars () {
	file=$(mktemp)
	cat >"$file" <<EOF
This is a long summary message which is longer than the seventy-two character limit.
EOF
	expected_msg="\
commit message longer than 72 characters
aborting commit"
	
	assert_equal "$expected_msg" "$(./commit-msg "$file")"

	rm "$file"
}

test_returns_1_if_summary_message_is_longer_than_72_chars () {
	file=$(mktemp)
	cat >"$file" <<EOF
This is a long summary message which is longer than the seventy-two character limit.
EOF
	./commit-msg "$file"

	assert_equal 1 $?

	rm "$file"
}

test_prints_error_message_if_no_blank_line_between_summary_and_description () {
	file=$(mktemp)
	cat >"$file" <<EOF
This summary message is less than 50 chars.
This description has no preceding blank line and should cause an error.
EOF
	expected_msg="\
the second line of a multi-line commit message should be empty
aborting commit"

	assert_equal "$expected_msg" "$(./commit-msg "$file")"

	rm "$file"
}

test_returns_1_if_no_blank_line_between_summary_and_description () {
	file=$(mktemp)
	cat >"$file" <<EOF
This summary message is less than 50 chars.
This description has no preceding blank line and should cause an error.
EOF
	./commit-msg "$file"

	assert_equal 1 $?

	rm "$file"
}

test_formats_commit_message_if_a_description_line_is_longer_than_72_chars () {
	file=$(mktemp)
	cat >"$file" <<EOF
This summary message is less than 50 chars.

This description is much longer than seventy-two characters and should be formatted so it's more readable.
EOF
	expected_result="\
This summary message is less than 50 chars.

This description is much longer than seventy-two characters and should
be formatted so it's more readable."

	./commit-msg "$file"

	assert_equal "$expected_result" "$(cat "$file")"

	rm "$file"
}

test_ignores_all_lines_after_the_marker_left_by_git_commit_verbose () {
	file=$(mktemp)
	cat >"$file" <<EOF
The following lines should be discarded
# ------------------------ >8 ------------------------
# blah
# blah
diff ...
+new lines
-old lines
 context lines
EOF
	expected_result="\
The following lines should be discarded"

	./commit-msg "$file"

	assert_equal "$expected_result" "$(cat "$file")"

	rm "$file"
}

test_ignores_all_comments () {
	file=$(mktemp)
	cat >"$file" <<EOF
# This is a leading comment
No comments should appear in the resulting commit message file
# This is another comment which should be ignored
# blah
# blah
EOF
	expected_result="\
No comments should appear in the resulting commit message file"

	./commit-msg "$file"

	assert_equal "$expected_result" "$(cat "$file")"

	rm "$file"
}
