
hamlike
=======

A document generating language similar to [haml](http://haml.info/).

It's not for templating, but is rather for document generating.
The formatter transform hamlike text into HTML in
one pass and does not generate intermediate AST or JavaScript code,
so embedding JavaScript here is not possible.

But it was defined with flexibility in mind.
It is easy to extend the formatter with custom tags.

Supported things are:

* `%tag`
* `.class`
* `#id`
* `%tag(attribute="value")`

* `:raw` for outputting raw html
* `:plain` for outputting character data

Other than that you can extend the formatter yourself.






