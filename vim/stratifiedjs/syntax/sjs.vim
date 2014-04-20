" Vim syntax file
" Language:   StratifiedJS
" Maintainer: Tim Cuthbertson <tim@onilabs.com>
" URL:        https://github.com/onilabs/stratifiedjs/tree/master/vim/
"
" forked from javascript.vim in vim 7.3.

" tuning parameters:
" unlet sjs_fold

if !exists("main_syntax")
  let main_syntax = 'sjs'
endif

" Drop fold if it set but vim doesn't support it.
if version < 600 && exists("sjs_fold")
  unlet sjs_fold
endif

syn keyword sjsCommentTodo      TODO FIXME XXX TBD contained
syn match   sjsLineComment      "\/\/.*" contains=@Spell,sjsCommentTodo
syn match   sjsCommentSkip      "^[ \t]*\*\($\|[ \t]\+\)"
syn region  sjsComment	       start="/\*"  end="\*/" contains=@Spell,sjsCommentTodo
syn match   sjsSpecial	       "\\\d\d\d\|\\."
syn region  sjsStringD	       start=+"+  skip=+\\\\\|\\"+  end=+"\|$+	contains=sjsSpecial,@htmlPreproc
syn region  sjsStringS	       start=+'+  skip=+\\\\\|\\'+  end=+'\|$+	contains=sjsSpecial,@htmlPreproc

syn match   sjsSpecialCharacter "'\\.'"
syn match   sjsNumber	       "-\=\<\d\+L\=\>\|0[xX][0-9a-fA-F]\+\>"
syn region  sjsRegexpString     start=+/[^/*]+me=e-1 skip=+\\\\\|\\/+ end=+/[gim]\{0,3\}\s*$+ end=+/[gim]\{0,3\}\s*[;.,)\]}]+me=e-1 contains=@htmlPreproc oneline

syn keyword sjsConditional	if else switch
syn keyword sjsRepeat		while for do in
syn keyword sjsBranch		break continue
syn keyword sjsOperator		new delete instanceof typeof
syn keyword sjsType		Array Boolean Date Function Number Object String RegExp
syn keyword sjsStatement	return with using
syn keyword sjsBoolean		true false
syn keyword sjsNull		null undefined
syn keyword sjsIdentifier	arguments this var let
syn match sjsAltnsIdentifier	"@[a-zA-Z_0-9]*"
syn keyword sjsLabel		case default
syn keyword sjsException		try catch finally throw
syn keyword sjsMessage		alert confirm prompt status
syn keyword sjsGlobal		window
syn keyword sjsReserved		abstract boolean byte char class const debugger double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile

syn region sjsParenBlock	matchgroup=sjsBraces start="(" end=")" contains=TOP
syn region sjsBlock		matchgroup=sjsBraces start="{" end="}" contains=TOP
syn region sjsBlock		matchgroup=sjsBraces start="\[" end="\]" contains=TOP
syn keyword sjsException	and or retract
syn keyword sjsGlobal		waitfor spawn require hold
syn keyword sjsStatement	using
syn region  sjsStringD		start=+"+  skip=+\\\\\|\\"\\#+  end=+"+	contains=sjsSpecial,@htmlPreproc
syn region  sjsStringB		start=+`+  skip=+\\\\\|\\`\\$+  end=+`+	contains=sjsSpecial,@htmlPreproc,sjsInterpolationDelimiter
syn region  sjsStringS		start=+'+  skip=+\\\\\|\\'+  end=+'+	contains=sjsSpecial,@htmlPreproc
syn region  sjsInterpolation	matchgroup=sjsInterpolationDelimiter start="#{" end="}" contained contains=TOP containedIn=sjsStringD
syn region  sjsInterpolation	matchgroup=sjsInterpolationDelimiter start="${" end="}" contained contains=TOP containedIn=sjsStringB
syn match  sjsInterpolationDelimiter	contained nextgroup=sjsNakedQuasiValue  "\$\ze[^{]"
syn region  sjsNakedQuasiValue	start="[a-zA-Z0-9_]" end="[a-zA-Z0-9_]*" contained nextgroup=sjsParenBlock
syn region  sjsNakedQuasiValue	matchgroup=sjsAltnsIdentifier start="@" end="[a-zA-Z0-9_]*" contained nextgroup=sjsParenBlock

syn keyword sjsFunction	function

"uncomment for debugging:
"map <F10> :echo "hi<" . synIDattr(synID(line("."),col("."),1),"name") . '> trans<'
"\ . synIDattr(synID(line("."),col("."),0),"name") . "> lo<"
"\ . synIDattr(synIDtrans(synID(line("."),col("."),1)),"name") . ">"<CR>

syn sync fromstart
syn sync maxlines=100

if main_syntax == "sjs"
  syn sync ccomment sjsComment
endif

" Define the default highlighting.
" For version 5.7 and earlier: only when not done already
" For version 5.8 and later: only when an item doesn't have highlighting yet
" if version >= 508 || !exists("did_sjs_syn_inits")
"   if version < 508
"     let did_sjs_syn_inits = 1
    command -nargs=+ HiLink hi link <args>
  " else
  "   command -nargs=+ HiLink hi def link <args>
  " endif
  HiLink sjsComment		Comment
  HiLink sjsLineComment		Comment
  HiLink sjsCommentTodo		Todo
  HiLink sjsSpecial		Special
  HiLink sjsStringS		String
  HiLink sjsStringD		String
  HiLink sjsStringB		String
  HiLink sjsCharacter		Character
  HiLink sjsSpecialCharacter	sjsSpecial
  HiLink sjsNumber		sjsValue
  HiLink sjsConditional		Conditional
  HiLink sjsRepeat		Repeat
  HiLink sjsBranch		Conditional
  HiLink sjsOperator		Operator
  HiLink sjsType			Type
  HiLink sjsStatement		Statement
  HiLink sjsFunction		Function
  HiLink sjsBraces		Function
  HiLink sjsInterpolationDelimiter		sjsBraces
  HiLink sjsError		Error
  HiLink sjsParenError		sjsError
  HiLink sjsNull			Keyword
  HiLink sjsBoolean		Boolean
  HiLink sjsRegexpString		String

  HiLink sjsIdentifier		Identifier
  HiLink sjsAltnsIdentifier	sjsGlobal
  HiLink sjsLabel		Label
  HiLink sjsException		Exception
  HiLink sjsMessage		Keyword
  HiLink sjsGlobal		Keyword
  HiLink sjsReserved		Keyword
  HiLink sjsDebug		Debug
  HiLink sjsConstant		Label

  delcommand HiLink
" endif

let b:current_syntax = "sjs"
if main_syntax == 'sjs'
  unlet main_syntax
endif

" vim: ts=8
