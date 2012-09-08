
function extend(base, implementation) {
  var sub = Object.create(base)
  for (var i in implementation) {
    if (Object.prototype.hasOwnProperty.call(implementation, i)) {
      sub[i] = implementation[i]
    }
  }
  return sub
}

function Formatter() {
  this.processors = this.processors.slice()
  this.specifiers = this.specifiers.slice()
  this.modes = Object.create(this.modes)
}

var formatter = Formatter.prototype

formatter.specifiers = [
  {
    match: /^%(\w+)/
  , action: function(tag, m) {
      tag.tagName = m[1]
    }
  }
, {
    match: /^\.([\w\-]+)/
  , action: function(tag, m) {
      tag['class'] = (tag['class'] ? tag['class'] + ' ' : '') + m[1]
    }
  }
, {
    match: /^#([\w\-\.]+)/
  , action: function(tag, m) {
      tag.id = m[1]
    }
  }
, {
    match: /^\(([^\)]+)\)/
  , action: function(tag, m) {
      m[1].replace(/(\w+)="([^"]+)"/g, function(all, name, value) {
        tag[name] = value
      })
    }
  , start: false
  }
]

function getTag(specifier) {
  var tag = {}
    , specifiers = this.specifiers
    , foundCount = 0
  while (specifier != '') {
    var found = false
    for (var i = 0; i < specifiers.length; i ++) {
      var c = specifiers[i]
      var m = (c.start !== false || foundCount > 0) && specifier.match(c.match)
      if (m) {
        c.action(tag, m)
        specifier = specifier.substr(m[0].length)
        found = true
        foundCount++
        break
      }
    }
    if (!found) return false
  }
  return tag
}

function htmlspecialchars(x) {
  return x.replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
}

formatter.modes = {
  plain: function(x) {
    return htmlspecialchars(x)
  }
, raw: function(x) {
    return x
  }
}

formatter.processors = [
  function tag(line, reader) {
    var m = line.match(/^\S+/)
    if (!m) return false
    var tag = getTag.call(this, m[0])
    if (!tag) return false
    return processTag.call(this, tag, line.substr(m[0].length), reader)
  }
, function block(line, reader) {
    var m = line.match(/^:(\w+)$/)
    if (!m) return false
    var mode = this.modes[m[1]]
    if (!mode) return false
    return mode.call(this, new IndentedReader(reader).readAll())
  }
]

function processTag(tag, line, reader) {
  var tagName = tag.tagName || 'div'
  var content = line.replace(/^\s*/, '')
  var more = this.format(new IndentedReader(reader))
  var attrs = ''
  for (var i in tag) {
    if (i != 'tagName' && tag.hasOwnProperty(i)) {
      attrs += ' ' + i + '="' + htmlspecialchars(tag[i]) + '"'
    }
  }
  content += more
  content = this.processInline(content)
  return '\n<' + tagName + attrs + '>' + content + '</' + tagName + '>'
}

formatter.processInline = function(text) {
  return text
}

formatter.format = function(reader) {
  if (typeof reader == 'string') return this.format(new LineReader(reader))
  var processors = this.processors
    , result = ''
    , that = this
  reader.eachLine(function(line) {
    // try out each processor
    for (var i = 0; i < processors.length; i ++) {
      var output = processors[i].call(that, line, reader)
      if (output !== false) {
        result += output
        return
      }
    }
    // else, output as plain text
    result += '\n' + line
  })
  return result
}

var reader = {
      next: function() {
        var ret = this.peek()
        this.advance()
        return ret
      }
    , eachLine: function(callback) {
        var count = 0
        while (this.hasNext()) {
          callback(this.next())
          count++
        }
        return count
      }
    , readAll: function() {
        var out = []
        this.eachLine(function(line) { out[out.length] = line })
        return out.join('\n')
      }
    , readIndented: function() {
        return new IndentedReader(this)
      }
    }

function LineReader(text) {
  return new ArrayReader(text.split(/\r\n|\r|\n/))
}

var arrayReader = extend(reader, {
      _index: 0
    , hasNext: function() {
        return this._index < this._data.length
      }
    , peek: function() {
        return this._data[this._index]
      }
    , advance: function() {
        this._index++
      }
    })

function ArrayReader(array) {
  return extend(arrayReader, { _data: array })
}

var indentedReader = extend(reader, {
      initialize: function() {
        if (this._reader.hasNext()) {
          this._base = this._getIndentation(this._reader.peek())
        }
        return this
      }
    , _getIndentation: function(text) {
        var m = text.match(/^\s*/)
        if (!m) return ''
        return m[0]
      }
    , hasNext: function() {
        if (!this._base) return false
        if (!this._reader.hasNext()) return false
        return this._process(this._reader.peek())
      }
    , _process: function(text) {
        if (text.substr(0, this._base.length) === this._base) {
          this._result = text.substr(this._base.length)
          return true
        }
        if (text.match(/^\s*$/)) {
          this._result = ''
          return true
        }
        return false
      }
    , peek: function() {
        if (this.hasNext()) return this._result
      }
    , advance: function() {
        this._reader.advance()
        this._result = null
      }
    })

function IndentedReader(reader) {
  return extend(indentedReader, { _reader: reader }).initialize()
}

exports.Formatter = Formatter


