. ~/.bashrc

cd ~/Projects/life

PS1='\[\e[1;34m\]life\[\e[m\]\$ '

export VIMINIT="${VIMINIT:+${VIMINIT} | }set expandtab tabstop=4 shiftwidth=0 autoread formatprg=fmt\ -p'//\ '"
export CMT='//'

alias t='npm run test'
alias f='npx prettier --write .'
alias todo='grep -- "- \[ ]" TODO.md'

watch() {
    npx onchange "$@" -- npm run test
}

repl() {
    node -i -e "$(sed -E "s/(export|default) //" "$@")"
}

# Tab-complete with file names known to git.
_f() {
    COMPREPLY=($(git ls-files ${2}*))
}
complete -F _f watch
complete -F _f repl
