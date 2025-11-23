. ~/.bashrc

cd ~/Projects/life

PS1='\[\e[1;34m\]life\[\e[m\]\$ '

export VIMINIT="${VIMINIT:+${VIMINIT} | }set et ts=4 sw=0 formatprg=fmt\ -p'//\ '"
export CMT='//'

alias t='npm test'
alias f='npm run format -- --write'
alias todo='grep -- "- \[ ]" TODO.md'
