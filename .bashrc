. ~/.bashrc

__git_ps1() {
    local branch=$(git branch --show-current)
    printf '%s' "${branch:-$(git rev-parse --short HEAD)}"
}

PS1='\[\e[1;34m\]life\[\e[m\](\[\e[33m\]$(__git_ps1)\[\e[m\]) \$ '

export VIMINIT="${VIMINIT+$VIMINIT | }set expandtab shiftwidth=4 autoread formatprg=fmt\ -w79\ -p//\\\  equalprg=cmt"
export CMT='//'

alias t='npm run test'
alias f='npx prettier --write .'
alias todo='grep -- "- \[ ]" TODO.md'

watch() {
    # nodemon watches all .js files by default, ignoring .git and node_modules.
    npx nodemon --exec 'npm run test'
}

serve() {
    npx browser-sync start --server life/ --files life/ --port 8080
}
