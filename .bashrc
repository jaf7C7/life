. ~/.bashrc

cd ~/Projects/life

PS1='\[\e[1;34m\]life\[\e[m\]\$ '

export VIMINIT="${VIMINIT:+${VIMINIT} | }set expandtab tabstop=4 shiftwidth=0 autoread formatprg=fmt\ -p'//\ '"
export CMT='//'

alias t='npm run test'
alias f='npx prettier --write .'
alias repl='node -i -e "$(sed -E "s/(export|default) //"'
alias todo='grep -- "- \[ ]" TODO.md'

# Usage: watch '*.js'
# Quote glob to only match files tracked by git.
watch() {
    set -- $(git ls-files "${@:-*.js}")
    printf '%s\n' "watching files:" "$@"
    npx onchange "$@" -- npm run test
}

