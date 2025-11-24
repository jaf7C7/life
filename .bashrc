. ~/.bashrc

cd ~/Projects/life

PS1='\[\e[1;34m\]life\[\e[m\]\$ '

export VIMINIT="${VIMINIT:+${VIMINIT} | }set expandtab tabstop=4 shiftwidth=0 autoread formatprg=fmt\ -p'//\ '"
export CMT='//'

alias t='npm run test'
alias f='npx prettier --write .'
alias watch='npx onchange "*.js" -- npm run test'
alias todo='grep -- "- \[ ]" TODO.md'
