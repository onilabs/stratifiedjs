# Emacs syntax support for Stratified JavaScript

js.el is a patched version of the lisp/progmodes/js.el file that comes with Emacs.

Install by placing something like this in your .emacs file:

    (add-to-list 'load-path "/path/to/this/directory/")

    (add-to-list 'auto-mode-alist '("\\.sjs$" . javascript-mode))
    (add-to-list 'auto-mode-alist '("\\.mho$" . javascript-mode))
    (add-to-list 'auto-mode-alist '("\\.app$" . javascript-mode))
    (add-to-list 'auto-mode-alist '("\\.api$" . javascript-mode))

