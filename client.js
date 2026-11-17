window.__ModuleLoader__.load({
  id: '@local/workspace-file-editor',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useMemo, useRef, useState } = React

    const ID = '@local/workspace-file-editor'
    const KIND = 'workspace-file-editor'
    const NS = 'workspaceFileEditor'
    const ROUTE = '/plugin/workspace-file-editor/rpc'
    const MAX_READ_BYTES = 2 * 1024 * 1024
    // Tokenizing on every keystroke only stays responsive for small files:
    // up to the sync limit the overlay re-highlights each render, up to the
    // max limit it waits for a typing pause, and past that the file keeps the
    // plain textarea it had before.
    const HIGHLIGHT_SYNC_LIMIT = 50000
    const HIGHLIGHT_MAX_LIMIT = 150000
    const HIGHLIGHT_DEBOUNCE_MS = 150
    // Completion scans a recent window of the document, not all of a 2 MB file.
    const COMPLETION_WORD_WINDOW = 80000
    const COMPLETION_MIN_PREFIX = 2
    const COMPLETION_LIMIT = 8
    /** Inline model completion: pause before asking, and bounded context. */
    const INLINE_REQUEST_DELAY = 400
    const INLINE_PREFIX_LIMIT = 6000
    const INLINE_SUFFIX_LIMIT = 2000

    /** Editor copy, registered as one namespace in both shipped languages. */
    const zh = {
      'tab.title': '文件编辑',
      'guide.title': '编辑并保存文件',
      'guide.description': '在侧边栏浏览、联想补全并保存代码',
      'shortcut.noSession': '请先选择会话',
      openEditor: '在文件编辑器中打开',
      search: '搜索',
      searchFiles: '文件',
      searchContent: '内容',
      searchFilesPlaceholder: '按文件名搜索工作区',
      searchContentPlaceholder: '搜索工作区文件内容',
      searchHint: '输入文件名或内容开始搜索',
      searching: '正在搜索…',
      noMatches: '没有匹配结果',
      searchTruncated: '结果过多，只显示前 200 条。',
      find: '查找',
      findPlaceholder: '在当前文件中查找',
      findPrev: '上一个匹配',
      findNext: '下一个匹配',
      close: '关闭',
      title: '工作区文件',
      back: '返回文件列表',
      reload: '重新读取',
      refresh: '刷新目录',
      save: '保存',
      saving: '保存中…',
      saved: '已保存',
      dirty: '未保存',
      clean: '已同步',
      discard: '放弃未保存的修改？',
      loading: '正在读取…',
      loadingFile: '正在打开文件…',
      loadingWorkspace: '正在读取工作区…',
      empty: '空目录',
      noWorkspace: '这个会话没有工作区目录。',
      retry: '重试',
      dismiss: '关闭提示',
      reloadAction: '重新读取',
      completions: '补全建议',
      inlineHint: 'Tab 接受补全 · Esc 忽略',
      inlineNone: '没有可用的补全',
      'error.completionUnavailable': '未配置可用的默认模型，无法进行行内补全。',
      'error.completionFailed': '补全失败：{message}',
      'error.completionTimeout': '补全超时。',
      draftRestored: '已恢复未保存的草稿',
      draftConflict: '发现较旧版本的草稿：文件已在外部被修改。',
      restoreDraft: '恢复草稿',
      discardDraft: '丢弃草稿',
      draftConflictRestored: '已载入旧草稿；保存会覆盖磁盘上的新内容。',
      mixedEol: '混合换行',
      mixedEolHint: '文件包含混合换行，保存后会统一为 {eol}。',
      sizeBig: '文件较大（{size} KB），编辑可能变慢。',
      'error.notFound': '文件或目录已不存在。',
      'error.notFile': '这不是一个普通文件。',
      'error.notDirectory': '这不是一个目录。',
      'error.notText': '这个文件不是 UTF-8 文本，无法编辑。',
      'error.tooLarge': '文件超过 2 MB，侧边栏编辑器无法打开。',
      'error.stale': '文件已被其他程序修改，请重新读取后再保存。',
      'error.denied': '当前会话的沙箱不允许写入这个文件。',
      'error.outside': '这个路径在工作区之外。',
      'error.forbidden': '需要本机所有者身份才能访问。',
      'error.unauthorized': '登录状态已失效，请刷新页面后重试。',
      'error.noSession': '这个会话已经关闭，无法读取工作区。',
      'error.noWorkspace': '这个会话没有工作区目录。',
      'error.permission': '没有权限读取或写入这个文件。',
      'error.io': '读写文件时出错。',
      'error.bodyTooLarge': '请求内容过大，无法保存。',
      'error.unavailable': '无法连接宿主文件服务。',
      'error.generic': '操作失败：{message}',
    }

    const en = {
      'tab.title': 'File editor',
      'guide.title': 'Edit and save files',
      'guide.description': 'Browse, complete, and save code from the sidebar',
      'shortcut.noSession': 'Select a session first',
      openEditor: 'Open in file editor',
      search: 'Search',
      searchFiles: 'Files',
      searchContent: 'Content',
      searchFilesPlaceholder: 'Search workspace file names',
      searchContentPlaceholder: 'Search workspace file contents',
      searchHint: 'Type a file name or content to search',
      searching: 'Searching…',
      noMatches: 'No matches',
      searchTruncated: 'Too many results; showing the first 200.',
      find: 'Find',
      findPlaceholder: 'Find in this file',
      findPrev: 'Previous match',
      findNext: 'Next match',
      close: 'Close',
      title: 'Workspace files',
      back: 'Back to files',
      reload: 'Reload file',
      refresh: 'Refresh folder',
      save: 'Save',
      saving: 'Saving…',
      saved: 'Saved',
      dirty: 'Unsaved',
      clean: 'Up to date',
      discard: 'Discard unsaved changes?',
      loading: 'Loading…',
      loadingFile: 'Opening file…',
      loadingWorkspace: 'Loading workspace…',
      empty: 'Empty folder',
      noWorkspace: 'This Session has no workspace directory.',
      retry: 'Retry',
      dismiss: 'Dismiss',
      reloadAction: 'Reload',
      completions: 'Completions',
      inlineHint: 'Tab to accept · Esc to dismiss',
      inlineNone: 'No completion available',
      'error.completionUnavailable': 'No default model is configured for inline completion.',
      'error.completionFailed': 'Completion failed: {message}',
      'error.completionTimeout': 'Completion timed out.',
      draftRestored: 'Restored an unsaved draft',
      draftConflict: 'An older draft exists: the file changed outside the editor.',
      restoreDraft: 'Restore draft',
      discardDraft: 'Discard draft',
      draftConflictRestored: 'Old draft loaded; saving will overwrite the newer file on disk.',
      mixedEol: 'Mixed line endings',
      mixedEolHint: 'This file mixes line endings; saving will normalize them to {eol}.',
      sizeBig: 'Large file ({size} KB); editing may be slow.',
      'error.notFound': 'The file or folder no longer exists.',
      'error.notFile': 'This is not a regular file.',
      'error.notDirectory': 'This is not a folder.',
      'error.notText': 'This file is not UTF-8 text and cannot be edited here.',
      'error.tooLarge': 'The file is larger than 2 MB and cannot be opened here.',
      'error.stale': 'The file changed outside the editor. Reload it before saving again.',
      'error.denied': 'The Session sandbox does not allow writing this file.',
      'error.outside': 'This path is outside the workspace.',
      'error.forbidden': 'Owner access is required.',
      'error.unauthorized': 'Your sign-in expired. Refresh the page and try again.',
      'error.noSession': 'This Session is closed, so its workspace cannot be read.',
      'error.noWorkspace': 'This Session has no workspace directory.',
      'error.permission': 'You do not have permission to read or write this file.',
      'error.io': 'Reading or writing the file failed.',
      'error.bodyTooLarge': 'The request was too large to save.',
      'error.unavailable': 'The host file service is unavailable.',
      'error.generic': 'Operation failed: {message}',
    }

    async function rpc(op, payload, signal) {
      let response
      try {
        response = await fetch(ROUTE, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ op, ...payload }),
          ...(signal === undefined ? {} : { signal }),
        })
      } catch (error) {
        if (signal?.aborted === true) return { ok: false, error: { code: 'aborted', message: 'Aborted' } }
        return { ok: false, error: { code: 'unavailable', message: String(error?.message ?? error) } }
      }
      let data
      try {
        data = await response.json()
      } catch {
        return { ok: false, error: { code: `http-${response.status}`, message: `HTTP ${response.status}` } }
      }
      if (data !== null && typeof data === 'object' && typeof data.ok === 'boolean') return data
      return { ok: false, error: { code: `http-${response.status}`, message: `HTTP ${response.status}` } }
    }

    /** Debounce the tokenizer input so a typing pause, not every key, pays its cost. */
    function useDebouncedValue(value, delay) {
      const [debounced, setDebounced] = useState(value)
      useEffect(() => {
        if (value === debounced) return undefined
        const timer = setTimeout(() => setDebounced(value), delay)
        return () => clearTimeout(timer)
      }, [value, delay, debounced])
      return debounced
    }

    /* -------------------------------------------------- syntax highlighting */

    // Colors are the theme's shiki token variables (the palette the built-in
    // code surfaces use), with light-theme fallbacks so a theme that does not
    // define them still renders readable code.
    const TOKEN = {
      comment: 'var(--shiki-token-comment, #868e96)',
      string: 'var(--shiki-token-string, #2f9e44)',
      number: 'var(--shiki-token-constant, #1c7ed6)',
      keyword: 'var(--shiki-token-keyword, #d6336c)',
      function: 'var(--shiki-token-function, #6741d9)',
      punctuation: 'var(--shiki-token-punctuation, #495057)',
      parameter: 'var(--shiki-token-parameter, #e8590c)',
    }

    const words = (list) => new Set(list.split(' '))

    const JS_KEYWORDS = words('as async await break case catch class const continue debugger default delete do else export extends finally for from function get if implements import in instanceof interface let new of package private protected public readonly return set static super switch this throw try typeof var void while with yield enum type namespace declare abstract keyof infer is satisfies override')
    const JAVA_KEYWORDS = words('abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while record sealed permits var yield')
    const C_KEYWORDS = words('auto break case char const continue default do double else enum extern float for goto if inline int long register restrict return short signed sizeof static struct switch typedef union unsigned void volatile while bool true false nullptr class namespace template public private protected virtual override new delete this using try catch throw operator noexcept')
    const GO_KEYWORDS = words('break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var nil true false iota')
    const RUST_KEYWORDS = words('as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while')
    const SWIFT_KEYWORDS = words('associatedtype class deinit enum extension fileprivate func import init inout internal let open operator private protocol public rethrows static struct subscript typealias var break case continue default defer do else fallthrough for guard if in repeat return switch where while as catch false is nil super self throw throws true try')
    const PHP_KEYWORDS = words('abstract and array as break callable case catch class clone const continue declare default die do echo else elseif empty enddeclare endfor endforeach endif endswitch endwhile eval exit extends final finally fn for foreach function global goto if implements include include_once instanceof insteadof interface isset list match namespace new or print private protected public readonly require require_once return static switch throw trait try unset use var while xor yield')
    const RUBY_KEYWORDS = words('BEGIN END alias and begin break case class def defined do else elsif end ensure false for if in module next nil not or redo rescue retry return self super then true undef unless until when while yield require attr_accessor attr_reader')
    const LUA_KEYWORDS = words('and break do else elseif end false for function goto if in local nil not or repeat return then true until while')
    const PYTHON_KEYWORDS = words('and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield match case')
    const SHELL_KEYWORDS = words('if then else elif fi for while until do done case esac function in select time coproc return exit export local readonly declare unset shift source alias')
    const POWERSHELL_KEYWORDS = words('begin break catch class continue data define do dynamicparam else elseif end enum exit filter finally for foreach from function hidden if in param process return static switch throw trap try until using var while workflow parallel sequence filter')
    const SQL_KEYWORDS = words('select from where insert into values update delete create table alter drop index join left right inner outer on group by order having limit offset union all distinct as and or not null is like in between exists case when then else end primary key foreign references default constraint unique view procedure function begin commit rollback truncate with returning')
    const BAT_KEYWORDS = words('if else exist defined errorlevel not goto call set setlocal endlocal for in do echo exit')
    const KOTLIN_KEYWORDS = words('as break class continue do else false for fun if in interface is null object package return super this throw true try typealias typeof val var when while by catch constructor delegate dynamic field file finally get import init param property receiver set setparam where actual abstract annotation companion const crossinline data enum expect external final infix inline inner internal lateinit noinline open operator out override private protected public reified sealed suspend tailrec vararg')

    const IDENTIFIER = /[A-Za-z_$][\w$]*/y
    const NUMBER = /(?:0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|\d[\d_]*(?:\.[\d_]+)?(?:[eE][+-]?\d+)?)n?/y

    function createSink() {
      const lines = [[]]
      let line = lines[0]
      function emit(text, color) {
        if (text === '') return
        const parts = String(text).split('\n')
        for (let index = 0; index < parts.length; index += 1) {
          if (index > 0) {
            line = []
            lines.push(line)
          }
          if (parts[index] !== '') {
            line.push(color === undefined ? { text: parts[index] } : { text: parts[index], color })
          }
        }
      }
      return { lines, emit }
    }

    function nextNonSpace(text, index) {
      let at = index
      while (at < text.length && (text[at] === ' ' || text[at] === '\t')) at += 1
      return text[at]
    }

    function quotedEnd(text, start, quote, multiline) {
      let index = start + 1
      while (index < text.length) {
        const char = text[index]
        if (char === '\\') {
          index += 2
          continue
        }
        if (char === quote) return index + 1
        if (char === '\n' && multiline !== true) return index
        index += 1
      }
      return index
    }

    /** C-family scanner: line/block comments, quoted strings, keywords, calls and numbers. */
    function scanCodeLike(text, sink, options) {
      const emit = sink.emit
      let index = 0
      while (index < text.length) {
        const char = text[index]
        if (char === '\n') {
          emit('\n')
          index += 1
          continue
        }
        if (options.blockComment !== undefined && text.startsWith(options.blockComment[0], index)) {
          const close = text.indexOf(options.blockComment[1], index + options.blockComment[0].length)
          const end = close === -1 ? text.length : close + options.blockComment[1].length
          emit(text.slice(index, end), TOKEN.comment)
          index = end
          continue
        }
        let lineComment = false
        for (const marker of options.lineComments ?? []) {
          if (text.startsWith(marker, index)) {
            lineComment = true
            break
          }
        }
        if (lineComment) {
          let end = text.indexOf('\n', index)
          if (end === -1) end = text.length
          emit(text.slice(index, end), TOKEN.comment)
          index = end
          continue
        }
        if (options.variable !== undefined && char === options.variable) {
          IDENTIFIER.lastIndex = index + 1
          const name = IDENTIFIER.exec(text)
          const end = name === null ? index + 1 : index + 1 + name[0].length
          emit(text.slice(index, end), TOKEN.parameter)
          index = end
          continue
        }
        if (options.quotes !== undefined && options.quotes.includes(char)) {
          if (options.tripleQuotes === true && text.startsWith(char + char + char, index)) {
            const close = text.indexOf(char + char + char, index + 3)
            const end = close === -1 ? text.length : close + 3
            emit(text.slice(index, end), TOKEN.string)
            index = end
            continue
          }
          const end = quotedEnd(text, index, char, char === '`' && options.templateStrings === true)
          emit(text.slice(index, end), TOKEN.string)
          index = end
          continue
        }
        IDENTIFIER.lastIndex = index
        const identifier = IDENTIFIER.exec(text)
        if (identifier !== null) {
          const word = identifier[0]
          const end = index + word.length
          let color
          if (options.keywords.has(word)) color = TOKEN.keyword
          else if (nextNonSpace(text, end) === '(') color = TOKEN.function
          emit(word, color)
          index = end
          continue
        }
        NUMBER.lastIndex = index
        const number = NUMBER.exec(text)
        if (number !== null) {
          emit(number[0], TOKEN.number)
          index += number[0].length
          continue
        }
        if (char === ' ' || char === '\t' || char === '\r') {
          let end = index + 1
          while (end < text.length && (text[end] === ' ' || text[end] === '\t' || text[end] === '\r')) end += 1
          emit(text.slice(index, end))
          index = end
          continue
        }
        if ('{}()[];,.:<>+-*/%=&|!?'.includes(char)) {
          emit(char, TOKEN.punctuation)
          index += 1
          continue
        }
        emit(char)
        index += 1
      }
    }

    const JS_OPTIONS = { lineComments: ['//'], blockComment: ['/*', '*/'], quotes: '"\'`', templateStrings: true, keywords: JS_KEYWORDS }
    const JAVA_OPTIONS = { lineComments: ['//'], blockComment: ['/*', '*/'], quotes: '"\'', keywords: JAVA_KEYWORDS }
    const C_OPTIONS = { lineComments: ['//'], blockComment: ['/*', '*/'], quotes: '"\'', keywords: C_KEYWORDS }
    const GO_OPTIONS = { lineComments: ['//'], blockComment: ['/*', '*/'], quotes: '"\'`', templateStrings: true, keywords: GO_KEYWORDS }
    const RUST_OPTIONS = { lineComments: ['//'], blockComment: ['/*', '*/'], quotes: '"', keywords: RUST_KEYWORDS }
    const SWIFT_OPTIONS = { lineComments: ['//'], blockComment: ['/*', '*/'], quotes: '"', keywords: SWIFT_KEYWORDS }
    const PHP_OPTIONS = { lineComments: ['//', '#'], blockComment: ['/*', '*/'], quotes: '"\'', keywords: PHP_KEYWORDS, variable: '$' }
    const KOTLIN_OPTIONS = { lineComments: ['//'], blockComment: ['/*', '*/'], quotes: '"\'', keywords: KOTLIN_KEYWORDS }
    const PYTHON_OPTIONS = { lineComments: ['#'], quotes: '"\'', tripleQuotes: true, keywords: PYTHON_KEYWORDS }
    const SHELL_OPTIONS = { lineComments: ['#'], quotes: '"\'`', keywords: SHELL_KEYWORDS, variable: '$' }
    const POWERSHELL_OPTIONS = { lineComments: ['#'], blockComment: ['<#', '#>'], quotes: '"\'', keywords: POWERSHELL_KEYWORDS, variable: '$' }
    const LUA_OPTIONS = { lineComments: ['--'], blockComment: ['--[[', ']]'], quotes: '"\'', keywords: LUA_KEYWORDS }
    const RUBY_OPTIONS = { lineComments: ['#'], quotes: '"\'', keywords: RUBY_KEYWORDS }
    const SQL_OPTIONS = { lineComments: ['--'], blockComment: ['/*', '*/'], quotes: '\'"', keywords: SQL_KEYWORDS }
    const BAT_OPTIONS = { lineComments: ['REM ', 'rem ', '::'], quotes: '"', keywords: BAT_KEYWORDS, variable: '%' }

    /** CSS/SCSS/LESS: comments, strings, at-rules, property names, numbers and hex colors. */
    function scanCss(text, sink, scss) {
      const emit = sink.emit
      let index = 0
      let depth = 0
      while (index < text.length) {
        const char = text[index]
        if (text.startsWith('/*', index)) {
          const close = text.indexOf('*/', index + 2)
          const end = close === -1 ? text.length : close + 2
          emit(text.slice(index, end), TOKEN.comment)
          index = end
          continue
        }
        if (scss && text.startsWith('//', index)) {
          let end = text.indexOf('\n', index)
          if (end === -1) end = text.length
          emit(text.slice(index, end), TOKEN.comment)
          index = end
          continue
        }
        if (char === '\n') {
          emit('\n')
          index += 1
          continue
        }
        if (char === '"' || char === "'") {
          const end = quotedEnd(text, index, char, true)
          emit(text.slice(index, end), TOKEN.string)
          index = end
          continue
        }
        if (char === '{') {
          depth += 1
          emit(char, TOKEN.punctuation)
          index += 1
          continue
        }
        if (char === '}') {
          depth = Math.max(0, depth - 1)
          emit(char, TOKEN.punctuation)
          index += 1
          continue
        }
        if (char === '@') {
          IDENTIFIER.lastIndex = index + 1
          const name = IDENTIFIER.exec(text)
          const end = name === null ? index + 1 : index + 1 + name[0].length
          emit(text.slice(index, end), TOKEN.keyword)
          index = end
          continue
        }
        if (char === '$') {
          IDENTIFIER.lastIndex = index + 1
          const name = IDENTIFIER.exec(text)
          const end = name === null ? index + 1 : index + 1 + name[0].length
          emit(text.slice(index, end), TOKEN.parameter)
          index = end
          continue
        }
        if (char === '#') {
          const hex = /#[0-9a-fA-F]{3,8}/y
          hex.lastIndex = index
          const match = hex.exec(text)
          if (match !== null) {
            emit(match[0], TOKEN.number)
            index += match[0].length
            continue
          }
        }
        NUMBER.lastIndex = index
        const number = NUMBER.exec(text)
        if (number !== null) {
          let end = index + number[0].length
          while (end < text.length && /[a-zA-Z%]/.test(text[end])) end += 1
          emit(text.slice(index, end), TOKEN.number)
          index = end
          continue
        }
        IDENTIFIER.lastIndex = index
        const identifier = IDENTIFIER.exec(text)
        if (identifier !== null) {
          const word = identifier[0]
          const end = index + word.length
          const after = nextNonSpace(text, end)
          let color
          if (after === '(') color = TOKEN.function
          else if (depth > 0 && after === ':') color = TOKEN.parameter
          emit(word, color)
          index = end
          continue
        }
        if (char === ' ' || char === '\t' || char === '\r') {
          let end = index + 1
          while (end < text.length && (text[end] === ' ' || text[end] === '\t' || text[end] === '\r')) end += 1
          emit(text.slice(index, end))
          index = end
          continue
        }
        if ('{}()[];,.:>&+~*=|^!'.includes(char)) {
          emit(char, TOKEN.punctuation)
          index += 1
          continue
        }
        emit(char)
        index += 1
      }
    }

    /** JSON/JSONC: keys, string values, numbers and literals. */
    function scanJson(text, sink, comments) {
      const emit = sink.emit
      let index = 0
      while (index < text.length) {
        const char = text[index]
        if (char === '\n') {
          emit('\n')
          index += 1
          continue
        }
        if (comments && text.startsWith('//', index)) {
          let end = text.indexOf('\n', index)
          if (end === -1) end = text.length
          emit(text.slice(index, end), TOKEN.comment)
          index = end
          continue
        }
        if (comments && text.startsWith('/*', index)) {
          const close = text.indexOf('*/', index + 2)
          const end = close === -1 ? text.length : close + 2
          emit(text.slice(index, end), TOKEN.comment)
          index = end
          continue
        }
        if (char === '"') {
          const end = quotedEnd(text, index, '"', true)
          emit(text.slice(index, end), nextNonSpace(text, end) === ':' ? TOKEN.parameter : TOKEN.string)
          index = end
          continue
        }
        if (char === 't' || char === 'f' || char === 'n') {
          const literal = /(?:true|false|null)/y
          literal.lastIndex = index
          const match = literal.exec(text)
          if (match !== null) {
            emit(match[0], TOKEN.keyword)
            index += match[0].length
            continue
          }
        }
        NUMBER.lastIndex = index
        const number = NUMBER.exec(text)
        if (number !== null) {
          emit(number[0], TOKEN.number)
          index += number[0].length
          continue
        }
        if ('{}[],:'.includes(char)) {
          emit(char, TOKEN.punctuation)
          index += 1
          continue
        }
        emit(char)
        index += 1
      }
    }

    /** One YAML/TOML-ish value run: quoted strings, literals, numbers, trailing comments. */
    function scanScalar(text, emit) {
      let index = 0
      while (index < text.length) {
        const char = text[index]
        if (char === '"' || char === "'") {
          const end = quotedEnd(text, index, char, true)
          emit(text.slice(index, end), TOKEN.string)
          index = end
          continue
        }
        if (char === '#' && (index === 0 || text[index - 1] === ' ' || text[index - 1] === '\t')) {
          emit(text.slice(index), TOKEN.comment)
          return
        }
        const literal = /(?:true|false|null|yes|no|on|off|~)/y
        literal.lastIndex = index
        const word = literal.exec(text)
        if (word !== null) {
          emit(word[0], TOKEN.keyword)
          index += word[0].length
          continue
        }
        NUMBER.lastIndex = index
        const number = NUMBER.exec(text)
        if (number !== null) {
          emit(number[0], TOKEN.number)
          index += number[0].length
          continue
        }
        let end = index + 1
        while (end < text.length && !'"\'#'.includes(text[end])) end += 1
        emit(text.slice(index, end))
        index = end
      }
    }

    function scanYaml(text, sink) {
      const emit = sink.emit
      const lines = text.split('\n')
      lines.forEach((line, lineIndex) => {
        if (lineIndex > 0) emit('\n')
        const key = /^(\s*)(-\s+)?([A-Za-z0-9_./$-]+)(\s*:)(?=\s|$)/.exec(line)
        if (key !== null) {
          emit(key[1])
          if (key[2] !== undefined) {
            emit('-', TOKEN.keyword)
            emit(key[2].slice(1))
          }
          emit(key[3], TOKEN.parameter)
          emit(key[4], TOKEN.punctuation)
          scanScalar(line.slice(key[0].length), emit)
          return
        }
        const dash = /^(\s*)(-\s+)/.exec(line)
        if (dash !== null) {
          emit(dash[1])
          emit('-', TOKEN.keyword)
          emit(dash[2].slice(1))
          scanScalar(line.slice(dash[0].length), emit)
          return
        }
        scanScalar(line, emit)
      })
    }

    function scanIni(text, sink) {
      const emit = sink.emit
      const lines = text.split('\n')
      lines.forEach((line, lineIndex) => {
        if (lineIndex > 0) emit('\n')
        const section = /^(\s*)(\[[^\]]*\])(.*)$/.exec(line)
        if (section !== null) {
          emit(section[1])
          emit(section[2], TOKEN.keyword)
          scanScalar(section[3], emit)
          return
        }
        const entry = /^(\s*)([A-Za-z0-9_./$-]+)(\s*[=:]\s*)/.exec(line)
        if (entry !== null) {
          emit(entry[1])
          emit(entry[2], TOKEN.parameter)
          emit(entry[3], TOKEN.punctuation)
          scanScalar(line.slice(entry[0].length), emit)
          return
        }
        const comment = /^\s*[#;]/.exec(line)
        if (comment !== null) {
          emit(line, TOKEN.comment)
          return
        }
        scanScalar(line, emit)
      })
    }

    function scanDiff(text, sink) {
      const emit = sink.emit
      const lines = text.split('\n')
      lines.forEach((line, lineIndex) => {
        if (lineIndex > 0) emit('\n')
        if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@') || line.startsWith('diff ') || line.startsWith('index ')) {
          emit(line, TOKEN.keyword)
        } else if (line.startsWith('+')) {
          emit(line, TOKEN.string)
        } else if (line.startsWith('-')) {
          emit(line, TOKEN.number)
        } else {
          emit(line)
        }
      })
    }

    function tagNameAt(text, start) {
      let index = start + 1
      if (text[index] === '/') index += 1
      const begin = index
      while (index < text.length && !/[\s/>]/.test(text[index])) index += 1
      return index > begin ? text.slice(begin, index).toLowerCase() : ''
    }

    function findTagEnd(text, start) {
      let index = start + 1
      while (index < text.length) {
        const char = text[index]
        if (char === '"' || char === "'") {
          index = quotedEnd(text, index, char, true)
          continue
        }
        if (char === '>') return index
        if (char === '<') return -1
        index += 1
      }
      return -1
    }

    function scanTag(text, start, end, emit) {
      let index = start
      if (text.startsWith('</', index)) {
        emit('</', TOKEN.punctuation)
        index += 2
      } else if (text.startsWith('<!', index)) {
        emit(text.slice(index, end + 1), TOKEN.comment)
        return
      } else {
        emit('<', TOKEN.punctuation)
        index += 1
      }
      const nameBegin = index
      while (index < end && !/[\s/>]/.test(text[index])) index += 1
      if (index > nameBegin) emit(text.slice(nameBegin, index), TOKEN.keyword)
      while (index < end) {
        const char = text[index]
        if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
          let stop = index + 1
          while (stop < end && /\s/.test(text[stop])) stop += 1
          emit(text.slice(index, stop))
          index = stop
          continue
        }
        if (char === '/' || char === '>') {
          emit(char, TOKEN.punctuation)
          index += 1
          continue
        }
        const attrBegin = index
        while (index < end && !/[\s=/>]/.test(text[index])) index += 1
        if (index > attrBegin) emit(text.slice(attrBegin, index), TOKEN.parameter)
        let cursor = index
        while (cursor < end && (text[cursor] === ' ' || text[cursor] === '\t')) cursor += 1
        if (text[cursor] === '=') {
          emit(text.slice(index, cursor + 1), TOKEN.punctuation)
          index = cursor + 1
          while (index < end && (text[index] === ' ' || text[index] === '\t')) {
            emit(text[index])
            index += 1
          }
          if (text[index] === '"' || text[index] === "'") {
            const stop = Math.min(quotedEnd(text, index, text[index], true), end)
            emit(text.slice(index, stop), TOKEN.string)
            index = stop
          }
          continue
        }
        if (index === attrBegin) index += 1
      }
      if (text[end] === '>') emit('>', TOKEN.punctuation)
    }

    /** HTML/XML/Vue/Svelte markup, with embedded <script> and <style> tokenized by their own scanners. */
    function scanMarkup(text, sink) {
      const emit = sink.emit
      const lower = text.toLowerCase()
      let index = 0
      while (index < text.length) {
        if (text.startsWith('<!--', index)) {
          const close = text.indexOf('-->', index + 4)
          const end = close === -1 ? text.length : close + 3
          emit(text.slice(index, end), TOKEN.comment)
          index = end
          continue
        }
        const char = text[index]
        if (char === '<') {
          const tagEnd = findTagEnd(text, index)
          if (tagEnd === -1) {
            emit(text.slice(index))
            break
          }
          const name = tagNameAt(text, index)
          scanTag(text, index, tagEnd, emit)
          index = tagEnd + 1
          if (name === 'script' || name === 'style') {
            const closeAt = lower.indexOf('</' + name, index)
            const innerEnd = closeAt === -1 ? text.length : closeAt
            const inner = text.slice(index, innerEnd)
            if (name === 'script') scanCodeLike(inner, sink, JS_OPTIONS)
            else scanCss(inner, sink, false)
            index = innerEnd
          }
          continue
        }
        if (char === '\n') {
          emit('\n')
          index += 1
          continue
        }
        let end = index + 1
        while (end < text.length && text[end] !== '<' && text[end] !== '\n') end += 1
        emit(text.slice(index, end))
        index = end
      }
    }

    const SCANNERS = {
      js: (text, sink) => scanCodeLike(text, sink, JS_OPTIONS),
      java: (text, sink) => scanCodeLike(text, sink, JAVA_OPTIONS),
      kotlin: (text, sink) => scanCodeLike(text, sink, KOTLIN_OPTIONS),
      c: (text, sink) => scanCodeLike(text, sink, C_OPTIONS),
      go: (text, sink) => scanCodeLike(text, sink, GO_OPTIONS),
      rs: (text, sink) => scanCodeLike(text, sink, RUST_OPTIONS),
      swift: (text, sink) => scanCodeLike(text, sink, SWIFT_OPTIONS),
      php: (text, sink) => scanCodeLike(text, sink, PHP_OPTIONS),
      py: (text, sink) => scanCodeLike(text, sink, PYTHON_OPTIONS),
      sh: (text, sink) => scanCodeLike(text, sink, SHELL_OPTIONS),
      ps1: (text, sink) => scanCodeLike(text, sink, POWERSHELL_OPTIONS),
      rb: (text, sink) => scanCodeLike(text, sink, RUBY_OPTIONS),
      lua: (text, sink) => scanCodeLike(text, sink, LUA_OPTIONS),
      sql: (text, sink) => scanCodeLike(text, sink, SQL_OPTIONS),
      bat: (text, sink) => scanCodeLike(text, sink, BAT_OPTIONS),
      css: (text, sink) => scanCss(text, sink, false),
      scss: (text, sink) => scanCss(text, sink, true),
      json: (text, sink) => scanJson(text, sink, false),
      jsonc: (text, sink) => scanJson(text, sink, true),
      markup: (text, sink) => scanMarkup(text, sink),
      yaml: (text, sink) => scanYaml(text, sink),
      ini: (text, sink) => scanIni(text, sink),
      diff: (text, sink) => scanDiff(text, sink),
    }

    const EXTENSION_LANGUAGES = {
      js: ['js', 'jsx', 'mjs', 'cjs'],
      ts: ['ts', 'tsx', 'mts', 'cts'],
      markup: ['html', 'htm', 'xhtml', 'xml', 'svg', 'xsd', 'xsl', 'xslt', 'vue', 'svelte', 'plist'],
      json: ['json', 'jsonl', 'ndjson'],
      jsonc: ['jsonc'],
      css: ['css'],
      scss: ['scss', 'less', 'sass'],
      yaml: ['yaml', 'yml'],
      ini: ['ini', 'conf', 'cfg', 'properties', 'toml', 'env'],
      py: ['py', 'pyw', 'pyi'],
      java: ['java', 'cs', 'scala', 'groovy', 'gradle', 'dart'],
      kotlin: ['kt', 'kts'],
      c: ['c', 'h', 'cc', 'cpp', 'cxx', 'hpp', 'hh', 'hxx', 'm', 'mm'],
      go: ['go'],
      rs: ['rs'],
      swift: ['swift'],
      php: ['php'],
      rb: ['rb', 'rake', 'gemspec'],
      lua: ['lua'],
      sql: ['sql'],
      sh: ['sh', 'bash', 'zsh', 'fish'],
      ps1: ['ps1', 'psm1', 'psd1'],
      bat: ['bat', 'cmd'],
      diff: ['diff', 'patch'],
      log: ['log', 'txt'],
    }

    const EXTENSION_BY_SUFFIX = new Map()
    Object.keys(EXTENSION_LANGUAGES).forEach((language) => {
      for (const suffix of EXTENSION_LANGUAGES[language]) EXTENSION_BY_SUFFIX.set(suffix, language)
    })

    // `.ts`/`.tsx` share the JavaScript grammar; `.log`/`.txt` stay plain.
    const GRAMMAR_BY_LANGUAGE = { ...SCANNERS, ts: SCANNERS.js }

    function languageForPath(path) {
      if (typeof path !== 'string') return undefined
      const slash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
      const base = path.slice(slash + 1)
      const dot = base.lastIndexOf('.')
      if (dot < 0) return undefined
      return EXTENSION_BY_SUFFIX.get(base.slice(dot + 1).toLowerCase())
    }

    /* ----------------------------------------------------- code completion */

    /** Per-language words the highlighter already knows; used as completion seeds. */
    const COMPLETION_KEYWORDS = {
      js: JS_KEYWORDS,
      ts: JS_KEYWORDS,
      java: JAVA_KEYWORDS,
      c: C_KEYWORDS,
      go: GO_KEYWORDS,
      rs: RUST_KEYWORDS,
      swift: SWIFT_KEYWORDS,
      php: PHP_KEYWORDS,
      rb: RUBY_KEYWORDS,
      lua: LUA_KEYWORDS,
      py: PYTHON_KEYWORDS,
      sh: SHELL_KEYWORDS,
      ps1: POWERSHELL_KEYWORDS,
      sql: SQL_KEYWORDS,
      bat: BAT_KEYWORDS,
      kotlin: KOTLIN_KEYWORDS,
    }
    const EMPTY_KEYWORDS = new Set()

    // Files that commonly hold credentials never receive automatic model
    // completion; Ctrl+Space still asks explicitly.
    const SECRET_FILE = /(?:^|[\\/])(?:\.env(?:\.[^\\/]*)?|id_(?:rsa|dsa|ecdsa|ed25519)|[^\\/]*\.(?:pem|key|p12|pfx)|credentials(?:\.[^\\/]*)?|secrets?(?:\.[^\\/]*)?)$/i

    /** Automatic inline completion runs only for code-like, non-secret files. */
    function autoCompletionAllowed(path) {
      if (typeof path !== 'string' || SECRET_FILE.test(path)) return false
      const language = languageForPath(path)
      return language !== undefined && language !== 'log'
    }

    const COMPLETION_PREFIX = /[\p{L}_$][\p{L}\p{N}_$]*$/u
    const COMPLETION_WORD = /[\p{L}_$][\p{L}\p{N}_$]{1,59}/gu

    /** Expand tabs to the textarea's two-column stops for measurement. */
    function expandTabs(line, size = 2) {
      let out = ''
      let column = 0
      for (const char of line) {
        if (char === '\t') {
          const width = size - (column % size)
          out += ' '.repeat(width)
          column += width
        } else {
          out += char
          column += 1
        }
      }
      return out
    }

    let completionCanvas
    /** Pixel width of one text run in the textarea's own font. */
    function measureRun(element, text) {
      const style = getComputedStyle(element)
      if (completionCanvas === undefined) completionCanvas = document.createElement('canvas')
      const context = completionCanvas.getContext('2d')
      if (context === null) return 0
      context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      return context.measureText(text).width
    }

    /** Caret position in the editor container's coordinate space, computed from
     * the textarea's own typography. The textarea is single-line wrapped
     * (`wrap="off"`), so a line index times the computed line height is exact.
     */
    function caretBox(element) {
      const style = getComputedStyle(element)
      const lineHeight = Number.parseFloat(style.lineHeight)
      const paddingTop = Number.parseFloat(style.paddingTop)
      const paddingLeft = Number.parseFloat(style.paddingLeft)
      const caret = element.selectionStart ?? 0
      const before = element.value.slice(0, caret)
      const lines = before.split('\n')
      const lastLine = expandTabs(lines[lines.length - 1])
      return {
        x: element.offsetLeft + paddingLeft + measureRun(element, lastLine) - element.scrollLeft,
        y: element.offsetTop + paddingTop + (lines.length - 1) * (Number.isFinite(lineHeight) ? lineHeight : 19)
          - element.scrollTop,
        lineHeight: Number.isFinite(lineHeight) ? lineHeight : 19,
      }
    }

    /** Box of one [start, end) range on its first line, in editor coordinates. */
    function rangeBox(element, text, start, end) {
      const style = getComputedStyle(element)
      const lineHeight = Number.parseFloat(style.lineHeight)
      const paddingTop = Number.parseFloat(style.paddingTop)
      const paddingLeft = Number.parseFloat(style.paddingLeft)
      const before = text.slice(0, start)
      const lines = before.split('\n')
      const lineIndex = lines.length - 1
      const lineStart = start - lines[lineIndex].length
      const fragment = text.slice(lineStart, end).split('\n')[0]
      return {
        x: element.offsetLeft + paddingLeft + measureRun(element, expandTabs(lines[lineIndex])) - element.scrollLeft,
        y: element.offsetTop + paddingTop + lineIndex * (Number.isFinite(lineHeight) ? lineHeight : 19) - element.scrollTop,
        width: Math.max(2, measureRun(element, expandTabs(fragment))),
        height: Number.isFinite(lineHeight) ? lineHeight : 19,
      }
    }

    /** Replace a textarea range through the browser's edit pipeline so native undo works. */
    function replaceRangeWithInput(element, text, start, end) {
      element.focus()
      element.setSelectionRange(start, end)
      try {
        if (document.execCommand('insertText', false, text)) return true
      } catch {
        // execCommand is deprecated; the native fallback below still edits.
      }
      element.setRangeText(text, start, end, 'end')
      return false
    }

    /** Character offset of a 1-based line/column in the current text. */
    function offsetOfLine(text, line, column = 1) {
      const lines = String(text).split('\n')
      const target = Math.max(1, Math.min(Math.floor(line), lines.length))
      let offset = 0
      for (let index = 0; index < target - 1; index += 1) offset += lines[index].length + 1
      return offset + Math.max(0, Math.min(Math.floor(column) - 1, lines[target - 1].length))
    }

    /** Center the line holding an offset inside the textarea's scrollport. */
    function scrollLineIntoView(element, text, offset) {
      const before = text.slice(0, offset)
      const line = before.split('\n').length - 1
      const style = getComputedStyle(element)
      const lineHeight = Number.parseFloat(style.lineHeight) || 19
      const paddingTop = Number.parseFloat(style.paddingTop)
      const top = paddingTop + line * lineHeight
      const target = top - element.clientHeight / 2 + lineHeight / 2
      element.scrollTop = Math.max(0, Math.min(target, element.scrollHeight - element.clientHeight))
    }

    /** Case-folded word frequencies from the recent part of one document. */
    function buildCompletionIndex(text) {
      const source = text.length > COMPLETION_WORD_WINDOW ? text.slice(-COMPLETION_WORD_WINDOW) : text
      const index = new Map()
      COMPLETION_WORD.lastIndex = 0
      let match
      while ((match = COMPLETION_WORD.exec(source)) !== null) {
        const word = match[0]
        const key = word.toLowerCase()
        let entry = index.get(key)
        if (entry === undefined) {
          if (index.size >= 6000) continue
          entry = { word, count: 0, last: 0 }
          index.set(key, entry)
        }
        entry.count += 1
        entry.last = match.index
      }
      return index
    }

    /** Rank document words and grammar keywords by prefix, use, and recency. */
    function completionCandidates(index, keywords, prefix, limit) {
      const lower = prefix.toLowerCase()
      const matches = []
      for (const entry of index.values()) {
        const word = entry.word
        const key = word.toLowerCase()
        if (key === lower || !key.startsWith(lower)) continue
        matches.push({ word, count: entry.count, last: entry.last, keyword: false })
      }
      for (const word of keywords) {
        const key = word.toLowerCase()
        if (key === lower || !key.startsWith(lower)) continue
        matches.push({ word, count: 0, last: -1, keyword: true })
      }
      matches.sort((left, right) => {
        const exactLeft = left.word.startsWith(prefix) ? 1 : 0
        const exactRight = right.word.startsWith(prefix) ? 1 : 0
        if (exactLeft !== exactRight) return exactRight - exactLeft
        if (left.count !== right.count) return right.count - left.count
        if (left.last !== right.last) return right.last - left.last
        if (left.word.length !== right.word.length) return left.word.length - right.word.length
        return left.word.localeCompare(right.word)
      })
      const seen = new Set()
      const unique = []
      for (const match of matches) {
        const key = match.word.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        unique.push(match.word)
        if (unique.length >= limit) break
      }
      return unique
    }

    /**
     * Tokenize one document into per-line runs.
     * @returns one array per source line, or undefined when no grammar applies.
     */
    function highlightToLines(text, language) {
      const scanner = language === undefined ? undefined : GRAMMAR_BY_LANGUAGE[language]
      if (scanner === undefined) return undefined
      try {
        const sink = createSink()
        scanner(text, sink)
        return sink.lines
      } catch {
        // A malformed document must never break editing; plain text is the fallback.
        return undefined
      }
    }

    /** One `<pre>` body: token runs per line, with the source newlines kept between them. */
    function highlightedContent(lines) {
      const children = []
      lines.forEach((line, lineIndex) => {
        if (lineIndex > 0) children.push('\n')
        line.forEach((token, tokenIndex) => {
          children.push(h('span', {
            key: `${lineIndex}:${tokenIndex}`,
            style: token.color === undefined ? undefined : { color: token.color },
          }, token.text))
        })
      })
      // A trailing empty source line (a file ending in `\n`) needs a line box
      // of its own, or the overlay is one line shorter than the textarea and
      // its maximum scroll offset no longer matches.
      children.push('\u200b')
      return children
    }

    function errorText(t, error) {
      const code = error?.code
      if (code === 'FS_NOT_FOUND' || code === 'not-found') return t('error.notFound')
      if (code === 'FS_NOT_REGULAR_FILE' || code === 'not-file') return t('error.notFile')
      if (code === 'FS_NOT_DIRECTORY' || code === 'not-directory') return t('error.notDirectory')
      if (code === 'FS_NOT_TEXT') return t('error.notText')
      if (code === 'FS_TOO_LARGE') return t('error.tooLarge')
      if (code === 'FS_STALE_VERSION') return t('error.stale')
      if (code === 'FS_SANDBOX_DENIED') return t('error.denied')
      if (code === 'FS_PERMISSION_DENIED') return t('error.permission')
      if (code === 'FS_IO_ERROR') return t('error.io')
      if (code === 'outside-workspace') return t('error.outside')
      if (code === 'forbidden') return t('error.forbidden')
      if (code === 'http-401' || code === 'http-403' || code === 'unauthorized') return t('error.unauthorized')
      if (code === 'session-not-found') return t('error.noSession')
      if (code === 'no-workspace') return t('error.noWorkspace')
      if (code === 'body-too-large') return t('error.bodyTooLarge')
      if (code === 'completion-unavailable') return t('error.completionUnavailable')
      if (code === 'completion-timeout') return t('error.completionTimeout')
      if (code === 'completion-failed') return t('error.completionFailed', { message: error?.message ?? '' })
      if (code === 'unavailable') return t('error.unavailable')
      return t('error.generic', { message: error?.message ?? String(error ?? '') })
    }

    /** Permanent refusals that the same Retry cannot resolve. */
    function retryable(error) {
      const code = error?.code
      return code !== 'FS_NOT_TEXT' && code !== 'FS_TOO_LARGE' && code !== 'FS_NOT_REGULAR_FILE'
        && code !== 'outside-workspace' && code !== 'forbidden'
        && code !== 'http-401' && code !== 'http-403' && code !== 'unauthorized'
    }

    /* ------------------------------------------------------- draft storage */

    const DRAFT_PREFIX = 'dsh.workspace-file-editor.draft.'

    const draftKey = (sessionId, path) => `${DRAFT_PREFIX}${String(sessionId)}:${String(path)}`

    function readDraft(sessionId, path) {
      try {
        if (typeof sessionStorage === 'undefined') return undefined
        const raw = sessionStorage.getItem(draftKey(sessionId, path))
        if (raw === null) return undefined
        const parsed = JSON.parse(raw)
        return typeof parsed?.text === 'string' && typeof parsed?.version === 'string' ? parsed : undefined
      } catch {
        return undefined
      }
    }

    function writeDraft(sessionId, path, draft) {
      try {
        if (typeof sessionStorage === 'undefined') return
        sessionStorage.setItem(draftKey(sessionId, path), JSON.stringify({ ...draft, savedAt: Date.now() }))
      } catch {
        // A full or disabled storage only costs draft recovery, never editing.
      }
    }

    function removeDraft(sessionId, path) {
      try {
        if (typeof sessionStorage === 'undefined') return
        sessionStorage.removeItem(draftKey(sessionId, path))
      } catch {
        // Removing an unreachable draft is best-effort.
      }
    }

    /** Drop drafts this Session has not reopened for a week. */
    function pruneDrafts(sessionId) {
      try {
        if (typeof sessionStorage === 'undefined') return
        const prefix = `${DRAFT_PREFIX}${String(sessionId)}:`
        const stale = []
        for (let index = 0; index < sessionStorage.length; index += 1) {
          const key = sessionStorage.key(index)
          if (key === null || !key.startsWith(prefix)) continue
          const raw = sessionStorage.getItem(key)
          try {
            const value = JSON.parse(raw)
            if (typeof value?.savedAt !== 'number' || Date.now() - value.savedAt > 7 * 24 * 60 * 60 * 1000) stale.push(key)
          } catch {
            stale.push(key)
          }
        }
        for (const key of stale) sessionStorage.removeItem(key)
      } catch {
        // Pruning is advisory; a disabled storage keeps every draft.
      }
    }

    const SAVE_HINT = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘S' : 'Ctrl+S'
    const splitPath = (path) => String(path ?? '').split(/[\\/]+/)
    const baseName = (path) => {
      const parts = splitPath(path).filter(Boolean)
      return parts.length === 0 ? String(path ?? '') : parts[parts.length - 1]
    }
    const relativeTo = (root, path) => {
      const value = String(path ?? '')
      const prefix = String(root ?? '')
      if (prefix.length > 0 && (value === prefix || value.startsWith(`${prefix}/`) || value.startsWith(`${prefix}\\`))) {
        return value.slice(prefix.length).replace(/^[\\/]+/, '') || baseName(value)
      }
      return value
    }

    /* ---------------------------------------------------------------- icons */

    const Svg = (props) => h('svg', {
      viewBox: '0 0 16 16', width: 14, height: 14, fill: 'none',
      stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round',
      'aria-hidden': true, ...props,
    })

    const IconChevron = () => h(Svg, { viewBox: '0 0 12 12', width: 12, height: 12 }, h('path', { d: 'M4.2 2.2 8 6l-3.8 3.8' }))
    const IconFile = () => h(Svg, null,
      h('path', { d: 'M4 1.8h5.2L12 4.6v9.6H4z' }),
      h('path', { d: 'M9.1 1.9v2.8h2.8' }))
    const IconFolder = () => h(Svg, null,
      h('path', { d: 'M1.8 4.2h4.1l1.4 1.5h6.9v7.9H1.8z' }),
      h('path', { d: 'M1.8 4.2V3h4.1l1.4 1.2' }))
    const IconArrowLeft = () => h(Svg, null, h('path', { d: 'M7.2 2.6 2.8 8l4.4 5.4M2.9 8h10.3' }))
    const IconRefresh = () => h(Svg, null,
      h('path', { d: 'M13.2 8a5.2 5.2 0 1 1-1.6-3.7' }),
      h('path', { d: 'M13.4 2.4v3.2h-3.2' }))
    const IconPencil = () => h(Svg, null,
      h('path', { d: 'm10.6 2.4 3 3-7.6 7.6-3.7.7.7-3.7z' }),
      h('path', { d: 'm9.2 3.8 3 3' }))
    const IconSearch = () => h(Svg, null,
      h('circle', { cx: 7, cy: 7, r: 4.2 }),
      h('path', { d: 'm10.2 10.2 3.8 3.8' }))
    const IconArrowUp = () => h(Svg, null, h('path', { d: 'M8 13V3.5M3.8 7.7 8 3.5l4.2 4.2' }))
    const IconArrowDown = () => h(Svg, null, h('path', { d: 'M8 3v9.5M3.8 8.3 8 12.5l4.2-4.2' }))
    const IconClose = () => h(Svg, { viewBox: '0 0 12 12', width: 12, height: 12 },
      h('path', { d: 'M2.5 2.5l7 7M9.5 2.5l-7 7' }))
    const IconWarning = () => h(Svg, null,
      h('path', { d: 'M8 2.2 14.4 13H1.6z' }),
      h('path', { d: 'M8 6.1v3.2M8 11.3v.1' }))

    /** Fixed-palette artwork for the guide card; matches the bundle icon. */
    function EditorArtwork({ size = 36, className }) {
      return h('svg', {
        width: size, height: size, viewBox: '0 0 36 36', fill: 'none',
        className, 'aria-hidden': true, xmlns: 'http://www.w3.org/2000/svg',
      },
      h('path', {
        d: 'M8 12.1c0-1 .8-1.8 1.8-1.8h4.5c.6 0 1.2.3 1.6.7l1.7 1.8h6.6c1 0 1.8.8 1.8 1.8v8.9c0 1-.8 1.8-1.8 1.8H9.8c-1 0-1.8-.8-1.8-1.8z',
        fill: '#FFBC4D',
      }),
      h('path', {
        d: 'm20.1 25.6-4 1.3 1.3-4 7.3-7.3 2.7 2.7z',
        fill: '#539CFA',
      }),
      h('path', { d: 'm24.7 15.6 2.7 2.7', stroke: '#3D7FE0', strokeWidth: 1.6, strokeLinecap: 'round' }))
    }

    /* ------------------------------------------------------------- controls */

    function IconButton({ label, disabled, onClick, children }) {
      return h('button', {
        type: 'button', className: 'wfe-icon-btn', 'aria-label': label, title: label,
        disabled: disabled === true, onClick,
      }, children)
    }

    function Message({ text, tone, action }) {
      return h('p', {
        className: `wfe-message${tone === 'error' ? ' wfe-message-error' : ''}`,
        role: tone === 'error' ? 'alert' : undefined,
      },
        tone === 'error' ? h('span', { className: 'wfe-message-icon' }, h(IconWarning)) : null,
        h('span', { className: 'wfe-message-text' }, text),
        action === undefined ? null : h('button', {
          type: 'button', className: 'wfe-link-button', onClick: action.onClick,
        }, action.label))
    }

    /* --------------------------------------------------------- tree pieces */

    function TreeRow({ entry, depth, open, current, onClick }) {
      const isDir = entry.type === 'directory'
      return h('button', {
        type: 'button',
        className: `wfe-row${current ? ' wfe-row-current' : ''}`,
        style: { paddingLeft: 10 + depth * 18 },
        'aria-expanded': isDir ? open : undefined,
        'aria-current': current ? 'true' : undefined,
        onClick,
      },
      isDir
        ? h('span', { className: `wfe-chevron${open ? ' wfe-chevron-open' : ''}` }, h(IconChevron))
        : h('span', { className: 'wfe-chevron-space' }),
      h('span', { className: 'wfe-glyph' }, isDir ? h(IconFolder) : h(IconFile)),
      h('span', { className: 'wfe-row-name' }, entry.name))
    }

    function statusRow(path, depth, node, t, retry) {
      if (node.status === 'loading') {
        return h('div', { key: `loading:${path}`, className: 'wfe-indent-message', style: { paddingLeft: 28 + depth * 18 } }, t('loading'))
      }
      return h('div', { key: `error:${path}`, className: 'wfe-indent-message wfe-message-error', style: { paddingLeft: 28 + depth * 18 } },
        errorText(t, node.error),
        ' ',
        retryable(node.error)
          ? h('button', { type: 'button', className: 'wfe-link-button', onClick: retry }, t('retry'))
          : null)
    }

    /* ---------------------------------------------------------------- page */

    function WorkspaceFileEditor(props) {
      const t = props.t ?? ((key) => key)
      const sessionId = props.sessionId
      const cwd = props.useSessions((sessions) => sessions?.byId?.[sessionId]?.cwd)
      const tabInfo = props.useTabInfo !== undefined ? props.useTabInfo() : undefined
      const visible = tabInfo?.tab?.visible !== false

      const [tree, setTree] = useState({ rootPath: undefined, nodes: {} })
      const [expanded, setExpanded] = useState([])
      const [mode, setMode] = useState('list')
      const [current, setCurrent] = useState(undefined)
      const [saving, setSaving] = useState(false)
      const [notice, setNotice] = useState(undefined)
      const [cwdPending, setCwdPending] = useState(true)
      const [composing, setComposing] = useState(false)
      const [caretAt, setCaretAt] = useState(0)
      const [manualTick, setManualTick] = useState(0)
      const [scrollTick, setScrollTick] = useState(0)
      const [completion, setCompletion] = useState(undefined)
      const [inline, setInline] = useState(undefined)
      const [ghostBox, setGhostBox] = useState(undefined)
      const [findOpen, setFindOpen] = useState(false)
      const [findQuery, setFindQuery] = useState('')
      const [findIndex, setFindIndex] = useState(0)
      const [findBox, setFindBox] = useState(undefined)
      const [searchOpen, setSearchOpen] = useState(false)
      const [searchMode, setSearchMode] = useState('names')
      const [searchText, setSearchText] = useState('')
      const [searchResults, setSearchResults] = useState(undefined)
      const [searchState, setSearchState] = useState('idle')
      const [searchError, setSearchError] = useState(undefined)
      const [searchTick, setSearchTick] = useState(0)
      const generation = useRef(0)
      const request = useRef(0)
      const currentRef = useRef(undefined)
      const textareaRef = useRef(null)
      const highlightRef = useRef(null)
      const editorRef = useRef(null)
      const rootRef = useRef(null)
      const findInputRef = useRef(null)
      const searchInputRef = useRef(null)
      const savingRef = useRef(false)
      const stowRef = useRef(() => {})
      const suppressRef = useRef(false)
      const suppressInlineRef = useRef(false)
      const manualRef = useRef(false)
      const wordIndexRef = useRef({ text: undefined, index: new Map() })
      const inlineTimerRef = useRef(undefined)
      const inlineAbortRef = useRef(undefined)
      const inlineRequestRef = useRef(0)
      const requestInlineRef = useRef(null)
      const typedRef = useRef(false)
      const visibleRef = useRef(true)
      const composingRef = useRef(false)
      const applyingRef = useRef(false)
      const completionUndoRef = useRef(undefined)
      const pendingJumpRef = useRef(undefined)
      currentRef.current = current
      visibleRef.current = visible
      composingRef.current = composing

      // A body that leaves the surface keeps its draft in sessionStorage, so a
      // tab switch, a closed tab, or a reload does not silently lose edits.
      stowRef.current = () => {
        const snapshot = currentRef.current
        if (snapshot !== undefined && snapshot.status === 'ready' && snapshot.text !== snapshot.original) {
          writeDraft(sessionId, snapshot.path, {
            text: snapshot.text, version: snapshot.version, eol: snapshot.eol,
          })
        }
      }
      useEffect(() => () => { stowRef.current() }, [])
      // Unmount cleanup does not run on reload or a hidden page; these events do.
      useEffect(() => {
        const stow = () => { stowRef.current() }
        const onVisibility = () => { if (document.visibilityState === 'hidden') stow() }
        window.addEventListener('pagehide', stow)
        document.addEventListener('visibilitychange', onVisibility)
        return () => {
          window.removeEventListener('pagehide', stow)
          document.removeEventListener('visibilitychange', onVisibility)
        }
      }, [])

      const loadDir = useCallback(async (path) => {
        const generationAtStart = generation.current
        setTree((previous) => ({
          ...previous,
          nodes: {
            ...previous.nodes,
            [path]: { status: 'loading', entries: previous.nodes[path]?.entries ?? [], error: previous.nodes[path]?.error },
          },
        }))
        const result = await rpc('list', { sessionId, path })
        if (generationAtStart !== generation.current) return
        if (result.ok) {
          setTree((previous) => ({
            rootPath: previous.rootPath ?? result.value.path,
            nodes: {
              ...previous.nodes,
              [path]: { status: 'ready', entries: result.value.entries },
              ...(result.value.path === path ? {} : {
                [result.value.path]: { status: 'ready', entries: result.value.entries },
              }),
            },
          }))
        } else {
          setTree((previous) => ({
            ...previous,
            nodes: {
              ...previous.nodes,
              [path]: { status: 'error', entries: previous.nodes[path]?.entries ?? [], error: result.error },
            },
          }))
        }
      }, [sessionId])

      useEffect(() => {
        generation.current += 1
        request.current += 1
        setTree({ rootPath: cwd, nodes: {} })
        setExpanded(cwd === undefined ? [] : [cwd])
        setMode('list')
        setCurrent(undefined)
        setNotice(undefined)
        setCwdPending(cwd === undefined)
        setSearchOpen(false)
        setSearchText('')
        setSearchResults(undefined)
        setSearchState('idle')
        setFindOpen(false)
        setFindBox(undefined)
        if (cwd !== undefined) {
          pruneDrafts(sessionId)
          void loadDir(cwd)
        }
        return () => { generation.current += 1 }
      }, [cwd, loadDir, sessionId])

      // A real no-workspace answer and a Session list that has not hydrated yet
      // look identical; hold the empty state briefly before claiming there is none.
      useEffect(() => {
        if (cwd !== undefined) return undefined
        const timer = setTimeout(() => setCwdPending(false), 1200)
        return () => clearTimeout(timer)
      }, [cwd])

      useEffect(() => {
        if (notice?.tone !== 'ok') return undefined
        const timer = setTimeout(() => setNotice(undefined), 3000)
        return () => clearTimeout(timer)
      }, [notice])

      // Opening a file puts the caret in the editor; a search result also
      // selects its line. The tree keeps the keyboard while no file is chosen.
      useEffect(() => {
        if (mode !== 'editor' || current?.status !== 'ready') return
        const element = textareaRef.current
        if (element === null) return
        element.focus()
        const jump = current.jump
        if (jump !== undefined) {
          const offset = offsetOfLine(element.value, jump.line, jump.column ?? 1)
          element.setSelectionRange(offset, offset)
          scrollLineIntoView(element, element.value, offset)
          setScrollTick((value) => value + 1)
          setCaretAt(element.selectionStart ?? 0)
          return
        }
        setCaretAt(element.selectionStart ?? 0)
      }, [mode, current?.path, current?.status])

      const rootPath = tree.rootPath
      const currentPath = current?.path
      const dirty = current !== undefined && current.status === 'ready' && current.text !== current.original

      // Highlighting is pure presentation: the textarea stays the single source
      // of truth, and a document without a known grammar stays plain text.
      const editorText = current !== undefined && current.status === 'ready' ? current.text : ''
      const language = current !== undefined && current.status === 'ready' ? languageForPath(current.path) : undefined
      const debouncedText = useDebouncedValue(editorText, HIGHLIGHT_DEBOUNCE_MS)
      const highlightSource = editorText.length <= HIGHLIGHT_SYNC_LIMIT ? editorText : debouncedText
      const lines = useMemo(() => {
        if (language === undefined || composing || editorText.length === 0) return undefined
        // A debounced frame is stale: painting it under the live textarea would
        // shift every character, so the editor stays plain until it catches up.
        if (highlightSource !== editorText || highlightSource.length > HIGHLIGHT_MAX_LIMIT) return undefined
        const tokenized = highlightToLines(highlightSource, language)
        // A line count mismatch would slide the tokens against the caret; only
        // an exact one-per-source-line tokenization may be drawn.
        if (tokenized === undefined || tokenized.length !== highlightSource.split('\n').length) return undefined
        return tokenized
      }, [composing, editorText, highlightSource, language])
      const highlighted = lines !== undefined
      const highlightContent = useMemo(
        () => (lines === undefined ? null : highlightedContent(lines)),
        [lines],
      )
      const syncScroll = useCallback(() => {
        const textarea = textareaRef.current
        const pre = highlightRef.current
        if (textarea === null || pre === null) return
        // The textarea's client box excludes its native scrollbars; matching
        // those insets is what keeps the colored overlay from drifting near
        // the bottom or right edge of a scrolled file.
        pre.style.bottom = `${textarea.offsetHeight - textarea.clientHeight}px`
        pre.style.right = `${textarea.offsetWidth - textarea.clientWidth}px`
        pre.scrollTop = textarea.scrollTop
        pre.scrollLeft = textarea.scrollLeft
      }, [])
      // A repaint, a wrapped file switch, and a fresh grammar all reset the
      // overlay to scroll position zero; mirror the textarea again afterwards.
      useEffect(() => { syncScroll() }, [highlighted, highlightContent, syncScroll])
      useEffect(() => { setCompletion(undefined) }, [current?.path, mode])

      const abortInline = useCallback(() => {
        if (inlineTimerRef.current !== undefined) {
          clearTimeout(inlineTimerRef.current)
          inlineTimerRef.current = undefined
        }
        inlineAbortRef.current?.abort()
        inlineAbortRef.current = undefined
        inlineRequestRef.current += 1
      }, [])

      const requestInline = async (manual) => {
        if (!visibleRef.current || composingRef.current) return
        const snapshot = currentRef.current
        const element = textareaRef.current
        if (snapshot === undefined || snapshot.status !== 'ready' || element === null) return
        if (element.selectionStart !== element.selectionEnd) return
        const text = element.value
        const caret = element.selectionStart ?? 0
        if (!manual && !autoCompletionAllowed(snapshot.path)) return
        const prefix = text.slice(Math.max(0, caret - INLINE_PREFIX_LIMIT), caret)
        const suffix = text.slice(caret, caret + INLINE_SUFFIX_LIMIT)
        if (prefix.length === 0 && suffix.length === 0) return
        abortInline()
        const requestId = inlineRequestRef.current + 1
        inlineRequestRef.current = requestId
        const controller = new AbortController()
        inlineAbortRef.current = controller
        let result
        try {
          result = await rpc('complete', {
            sessionId,
            path: snapshot.path,
            language: languageForPath(snapshot.path) ?? '',
            prefix,
            suffix,
          }, controller.signal)
        } finally {
          if (inlineAbortRef.current === controller) inlineAbortRef.current = undefined
        }
        if (requestId !== inlineRequestRef.current || controller.signal.aborted) return
        if (!result.ok) {
          if (manual) setNotice({ tone: 'error', text: errorText(t, result.error) })
          return
        }
        const completionText = result.value?.completion
        if (typeof completionText !== 'string' || completionText.length === 0) {
          if (manual) setNotice({ tone: 'ok', text: t('inlineNone') })
          return
        }
        // The ghost belongs to the exact text and caret that asked for it.
        const now = textareaRef.current
        if (now === null || now.value !== text || now.selectionStart !== caret) return
        setCompletion(undefined)
        setInline({ text: completionText, caret, source: text })
      }
      requestInlineRef.current = requestInline

      // Abort any pending request when the plugin body goes away.
      useEffect(() => () => { abortInline() }, [abortInline])

      // A typing pause asks the model for one inline completion. Caret-only
      // moves never schedule a request; onSelect only invalidates the ghost.
      useEffect(() => {
        abortInline()
        setInline(undefined)
        if (mode !== 'editor' || current?.status !== 'ready' || composing || !visible || findOpen) return undefined
        if (!typedRef.current || suppressInlineRef.current) return undefined
        if (!autoCompletionAllowed(current.path)) return undefined
        const timer = setTimeout(() => {
          inlineTimerRef.current = undefined
          requestInlineRef.current?.(false)
        }, INLINE_REQUEST_DELAY)
        inlineTimerRef.current = timer
        return () => {
          if (inlineTimerRef.current === timer) {
            clearTimeout(inlineTimerRef.current)
            inlineTimerRef.current = undefined
          }
        }
      }, [current?.text, mode, current?.status, composing, visible, current?.path, findOpen, abortInline])

      // Anchor the ghost at the caret and keep it there while the textarea
      // scrolls; a caret that moved away invalidates the completion.
      useEffect(() => {
        if (inline === undefined) {
          setGhostBox(undefined)
          return
        }
        const element = textareaRef.current
        const editor = editorRef.current
        if (element === null || editor === null) {
          setGhostBox(undefined)
          return
        }
        if (element.value !== inline.source || element.selectionStart !== inline.caret) {
          setInline(undefined)
          return
        }
        const box = caretBox(element)
        if (box.y < -box.lineHeight || box.y > editor.clientHeight
          || box.x < -20 || box.x > editor.clientWidth - 4) {
          setInline(undefined)
          return
        }
        setGhostBox({
          // One pixel of clearance keeps the textarea's caret visible beside
          // the ghost's first character.
          x: box.x + 1,
          y: box.y,
          width: Math.max(40, editor.clientWidth - box.x - 12),
          height: Math.max(24, editor.clientHeight - box.y - 8),
        })
      }, [inline, scrollTick])

      // Suggestions follow the caret. A word prefix of two characters opens
      // them while typing; Ctrl+Space asks for them explicitly, including at an
      // empty prefix. The document word index is rebuilt only when the text
      // changes, from the recent part of the file.
      useEffect(() => {
        if (mode !== 'editor' || current?.status !== 'ready' || composing || inline !== undefined || findOpen) {
          setCompletion(undefined)
          return
        }
        if (suppressRef.current) {
          // An accepted completion stays closed until the user types again (or
          // asks explicitly), rather than reopening on the acceptance's caret
          // update.
          setCompletion(undefined)
          return
        }
        const element = textareaRef.current
        const editor = editorRef.current
        if (element === null || editor === null || editor.clientWidth === 0) {
          setCompletion(undefined)
          return
        }
        const manual = manualRef.current
        manualRef.current = false
        const caret = Math.min(Math.max(0, caretAt), element.value.length)
        // Mid-word carets and real selections have no unambiguous replacement.
        if (element.selectionStart !== element.selectionEnd) {
          setCompletion(undefined)
          return
        }
        if (/[\p{L}\p{N}_$]/u.test(element.value.slice(caret, caret + 1))) {
          setCompletion(undefined)
          return
        }
        const before = element.value.slice(0, caret)
        const match = COMPLETION_PREFIX.exec(before)
        const prefix = match === null ? '' : match[0]
        if (!manual && prefix.length < COMPLETION_MIN_PREFIX) {
          setCompletion(undefined)
          return
        }
        const cache = wordIndexRef.current
        if (cache.text !== element.value) {
          cache.text = element.value
          cache.index = buildCompletionIndex(element.value)
        }
        const items = completionCandidates(
          cache.index,
          COMPLETION_KEYWORDS[language] ?? EMPTY_KEYWORDS,
          prefix,
          COMPLETION_LIMIT,
        )
        if (items.length === 0) {
          setCompletion(undefined)
          return
        }
        const box = caretBox(element)
        // A caret scrolled out of view has no place to anchor the popup.
        if (box.y < -box.lineHeight || box.y > editor.clientHeight) {
          setCompletion(undefined)
          return
        }
        const width = Math.max(120, Math.min(280, editor.clientWidth - 16))
        const height = Math.min(items.length, 6) * 26 + 8
        const below = box.y + box.lineHeight + 4
        const above = box.y - height - 4
        const y = below + height <= editor.clientHeight - 6 || above < 4 ? below : above
        const x = Math.max(8, Math.min(box.x, editor.clientWidth - width - 8))
        setCompletion({ items, index: 0, prefix, start: caret - prefix.length, end: caret, x, y, width })
      }, [mode, current?.status, current?.text, caretAt, manualTick, scrollTick, composing, language, inline, findOpen])

      /* ------------------------------------------------------ file search */

      const findMatches = useMemo(() => {
        if (!findOpen || findQuery.length === 0 || current === undefined || current.status !== 'ready') return []
        const haystack = current.text.toLowerCase()
        const needle = findQuery.toLowerCase()
        const matches = []
        let from = 0
        while (matches.length < 1000) {
          const at = haystack.indexOf(needle, from)
          if (at === -1) break
          matches.push(at)
          from = at + Math.max(1, needle.length)
        }
        return matches
      }, [findOpen, findQuery, current?.text, current?.status])

      // Move to the current hit and center its line. Scrolling separately only
      // repositions the highlight, never re-centers the textarea.
      useEffect(() => {
        if (!findOpen || findMatches.length === 0 || current === undefined || current.status !== 'ready') return
        const element = textareaRef.current
        if (element === null) return
        const index = ((findIndex % findMatches.length) + findMatches.length) % findMatches.length
        const start = findMatches[index]
        element.setSelectionRange(start, start + findQuery.length)
        scrollLineIntoView(element, current.text, start)
        setScrollTick((value) => value + 1)
      }, [findOpen, findQuery, findIndex, current?.path, current?.status])

      // The translucent hit marker; it follows the textarea's scroll and is
      // dropped when the hit is outside the viewport.
      useEffect(() => {
        if (!findOpen || findMatches.length === 0 || current === undefined || current.status !== 'ready') {
          setFindBox(undefined)
          return
        }
        const element = textareaRef.current
        const editor = editorRef.current
        if (element === null || editor === null) {
          setFindBox(undefined)
          return
        }
        const index = ((findIndex % findMatches.length) + findMatches.length) % findMatches.length
        const start = findMatches[index]
        const box = rangeBox(element, current.text, start, start + findQuery.length)
        if (box.y < -box.height || box.y > editor.clientHeight || box.x < -20 || box.x > editor.clientWidth) {
          setFindBox(undefined)
          return
        }
        setFindBox(box)
      }, [findOpen, findMatches, findIndex, findQuery, current?.text, current?.status, scrollTick])

      /* -------------------------------------------------- workspace search */

      useEffect(() => {
        if (!searchOpen) {
          setSearchResults(undefined)
          setSearchState('idle')
          setSearchError(undefined)
          return undefined
        }
        const query = searchText.trim()
        if (query.length === 0) {
          setSearchResults(undefined)
          setSearchState('idle')
          setSearchError(undefined)
          return undefined
        }
        const controller = new AbortController()
        setSearchState('loading')
        setSearchError(undefined)
        setSearchResults(undefined)
        const timer = setTimeout(async () => {
          const result = await rpc(
            searchMode === 'names' ? 'search-names' : 'search-content',
            { sessionId, query },
            controller.signal,
          )
          if (controller.signal.aborted) return
          if (!result.ok) {
            setSearchState('error')
            setSearchError(result.error)
            return
          }
          setSearchResults(result.value)
          setSearchState('ready')
        }, 300)
        return () => {
          clearTimeout(timer)
          controller.abort()
        }
      }, [searchOpen, searchText, searchMode, sessionId, searchTick])

      useEffect(() => {
        if (!searchOpen) return
        queueMicrotask(() => searchInputRef.current?.focus())
      }, [searchOpen])
      // Row handlers may be memoized from an earlier drawing, so the discard
      // check reads the live record instead of the closure that built the row.
      const isDirty = () => {
        const snapshot = currentRef.current
        return snapshot !== undefined && snapshot.status === 'ready' && snapshot.text !== snapshot.original
      }
      const confirmDiscard = () => !isDirty() || window.confirm(t('discard'))

      const toggleDir = (path) => {
        if (expanded.includes(path)) {
          setExpanded((previous) => previous.filter((value) => value !== path))
          return
        }
        setExpanded((previous) => [...previous, path])
        // Re-list on every expansion so entries created outside the panel appear.
        void loadDir(path)
      }

      const refreshAll = () => {
        const paths = new Set([rootPath, ...expanded].filter((value) => value !== undefined))
        for (const path of paths) void loadDir(path)
      }

      const loadFile = async (path) => {
        const generationAtStart = generation.current
        const requestAtStart = ++request.current
        const jump = pendingJumpRef.current
        pendingJumpRef.current = undefined
        completionUndoRef.current = undefined
        abortInline()
        setInline(undefined)
        typedRef.current = false
        suppressInlineRef.current = false
        setMode('editor')
        setNotice(undefined)
        setCompletion(undefined)
        suppressRef.current = false
        setFindOpen(false)
        setFindBox(undefined)
        setCurrent({ status: 'loading', path })
        const result = await rpc('read', { sessionId, path })
        if (generationAtStart !== generation.current || requestAtStart !== request.current) return
        if (!result.ok) {
          setCurrent({ status: 'error', path, error: result.error })
          return
        }
        const draft = readDraft(sessionId, result.value.path)
        const restorable = draft !== undefined && draft.version === result.value.version
        setCurrent({
          status: 'ready', path: result.value.path,
          text: restorable ? draft.text : result.value.text,
          original: result.value.text,
          version: result.value.version,
          eol: result.value.eol,
          mixed: result.value.mixed === true,
          size: result.value.size,
          jump,
        })
        if (restorable) {
          setNotice({ tone: 'ok', text: t('draftRestored') })
        } else if (draft !== undefined) {
          // Never throw away a draft the user may still need; offer the choice.
          setNotice({
            tone: 'error',
            text: t('draftConflict'),
            actions: [
              {
                label: t('restoreDraft'),
                onClick: () => {
                  setCurrent((previous) => previous !== undefined && previous.status === 'ready'
                    ? { ...previous, text: draft.text }
                    : previous)
                  setNotice({ tone: 'error', text: t('draftConflictRestored') })
                },
              },
              {
                label: t('discardDraft'),
                onClick: () => {
                  removeDraft(sessionId, result.value.path)
                  setNotice(undefined)
                },
              },
            ],
          })
        }
      }

      const openFile = async (path, jump = undefined) => {
        if (!confirmDiscard()) return
        const previousSnapshot = currentRef.current
        if (previousSnapshot !== undefined) removeDraft(sessionId, previousSnapshot.path)
        pendingJumpRef.current = jump
        await loadFile(path)
      }

      const save = async () => {
        const snapshot = currentRef.current
        if (snapshot === undefined || snapshot.status !== 'ready' || savingRef.current) return
        if (snapshot.text === snapshot.original) return
        const text = snapshot.text
        savingRef.current = true
        setSaving(true)
        setNotice(undefined)
        let result
        try {
          result = await rpc('write', {
            sessionId, path: snapshot.path, text, version: snapshot.version, eol: snapshot.eol,
          })
        } catch (error) {
          result = { ok: false, error: { code: 'unavailable', message: String(error?.message ?? error) } }
        } finally {
          savingRef.current = false
          setSaving(false)
        }
        if (!result.ok) {
          setNotice({
            tone: 'error',
            text: errorText(t, result.error),
            actions: result.error?.code === 'FS_STALE_VERSION'
              ? [{ label: t('reloadAction'), onClick: () => { void reload() } }]
              : undefined,
          })
          return
        }
        removeDraft(sessionId, snapshot.path)
        setCurrent((previous) => previous !== undefined && previous.path === snapshot.path
          ? { ...previous, version: result.value.version, original: text }
          : previous)
        setNotice({ tone: 'ok', text: t('saved') })
      }

      const reload = async () => {
        const snapshot = currentRef.current
        if (snapshot === undefined) return
        if (!confirmDiscard()) return
        removeDraft(sessionId, snapshot.path)
        await loadFile(snapshot.path)
      }

      const back = () => {
        if (!confirmDiscard()) return
        const snapshot = currentRef.current
        if (snapshot !== undefined) removeDraft(sessionId, snapshot.path)
        // A read still in flight must not repopulate the editor after leaving it.
        request.current += 1
        abortInline()
        setInline(undefined)
        completionUndoRef.current = undefined
        setFindOpen(false)
        setFindBox(undefined)
        setCurrent(undefined)
        setMode('list')
        setNotice(undefined)
      }

      const acceptInline = () => {
        const active = inline
        const element = textareaRef.current
        if (active === undefined || element === null) return
        const caret = element.selectionStart ?? 0
        if (caret !== active.caret || element.value !== active.source) {
          setInline(undefined)
          return
        }
        // Both suggesters stay quiet until the next real input.
        suppressInlineRef.current = true
        suppressRef.current = true
        const before = element.value
        applyingRef.current = true
        try {
          replaceRangeWithInput(element, active.text, caret, caret)
        } finally {
          queueMicrotask(() => { applyingRef.current = false })
        }
        setCurrent((previous) => previous !== undefined && previous.status === 'ready'
          ? { ...previous, text: element.value }
          : previous)
        completionUndoRef.current = { before, after: element.value, caret }
        setCaretAt(element.selectionStart ?? 0)
        setInline(undefined)
        setGhostBox(undefined)
        setCompletion(undefined)
      }

      const acceptCompletion = (index = undefined) => {
        const active = completion
        const element = textareaRef.current
        if (active === undefined || element === null) return
        const word = active.items[index ?? active.index]
        if (word === undefined) return
        const caret = element.selectionStart ?? 0
        // If the caret moved after the popup was measured, the remembered range
        // is no longer the user's word; drop the suggestion instead of editing
        // somewhere else.
        if (caret !== active.end) {
          setCompletion(undefined)
          return
        }
        suppressRef.current = true
        suppressInlineRef.current = true
        const before = element.value
        applyingRef.current = true
        try {
          replaceRangeWithInput(element, word, active.start, active.end)
        } finally {
          queueMicrotask(() => { applyingRef.current = false })
        }
        setCurrent((previous) => previous === undefined ? previous : { ...previous, text: element.value })
        completionUndoRef.current = { before, after: element.value, caret: active.end }
        setCaretAt(element.selectionStart ?? 0)
        setCompletion(undefined)
      }

      const openFind = () => {
        if (findOpen) {
          queueMicrotask(() => findInputRef.current?.focus())
          return
        }
        abortInline()
        setInline(undefined)
        setCompletion(undefined)
        suppressInlineRef.current = true
        suppressRef.current = true
        const element = textareaRef.current
        const selected = element !== null && element.selectionStart !== element.selectionEnd
          ? element.value.slice(element.selectionStart, element.selectionEnd)
          : ''
        setFindQuery(selected.length > 0 && selected.length <= 200 && !selected.includes('\n') ? selected : '')
        setFindIndex(0)
        setFindOpen(true)
        queueMicrotask(() => findInputRef.current?.focus())
      }

      const closeFind = () => {
        setFindOpen(false)
        setFindBox(undefined)
        textareaRef.current?.focus()
      }

      const openSearchResult = (match) => {
        const jump = typeof match.line === 'number'
          ? { line: match.line, column: match.column ?? 1 }
          : undefined
        void openFile(match.path, jump)
      }

      const onEditorKeyDown = (event) => {
        const commandKey = event.ctrlKey || event.metaKey
        // The acceptance itself is one undo step; this restores the exact text
        // and caret replaced by the completion.
        if (commandKey && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'z') {
          const undo = completionUndoRef.current
          const element = event.currentTarget
          if (undo !== undefined && element.value === undo.after) {
            event.preventDefault()
            completionUndoRef.current = undefined
            applyingRef.current = true
            element.setRangeText(undo.before, 0, element.value.length, 'end')
            setCurrent((previous) => previous !== undefined && previous.status === 'ready'
              ? { ...previous, text: undo.before }
              : previous)
            const caret = Math.min(undo.caret, undo.before.length)
            element.setSelectionRange(caret, caret)
            setCaretAt(caret)
            queueMicrotask(() => { applyingRef.current = false })
            return
          }
        }
        if (commandKey && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'f') {
          event.preventDefault()
          openFind()
          return
        }
        if (inline !== undefined) {
          if (event.key === 'Tab' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault()
            acceptInline()
            return
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            abortInline()
            setInline(undefined)
            suppressInlineRef.current = true
            suppressRef.current = true
            setCompletion(undefined)
            return
          }
        }
        if (completion !== undefined) {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            const delta = event.key === 'ArrowDown' ? 1 : -1
            setCompletion((previous) => previous === undefined
              ? previous
              : { ...previous, index: (previous.index + delta + previous.items.length) % previous.items.length })
            return
          }
          if ((event.key === 'Tab' || event.key === 'Enter') && !event.shiftKey
            && !event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault()
            acceptCompletion()
            return
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            setCompletion(undefined)
            return
          }
        }
        if ((event.ctrlKey || event.metaKey) && event.code === 'Space') {
          event.preventDefault()
          suppressRef.current = false
          suppressInlineRef.current = false
          abortInline()
          setInline(undefined)
          manualRef.current = true
          setCaretAt(event.currentTarget.selectionStart ?? 0)
          setManualTick((value) => value + 1)
          void requestInlineRef.current?.(true)
          return
        }
        if (event.key === 'Escape') {
          event.currentTarget.blur()
          return
        }
        if (event.key !== 'Tab' || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return
        event.preventDefault()
        const element = event.currentTarget
        const start = element.selectionStart
        const end = element.selectionEnd
        // The native insertion keeps undo usable for the indentation.
        if (!replaceRangeWithInput(element, '  ', start, end)) {
          setCurrent((previous) => previous === undefined ? previous : { ...previous, text: element.value })
        }
        setCaretAt(element.selectionStart ?? 0)
      }

      // The editor's save key works wherever the panel holds focus, but only
      // while this tab is on screen and focus is inside it; another visible
      // editor (split panes) or the chat composer keeps its own behavior.
      const saveRef = useRef(null)
      saveRef.current = save
      const fileReady = current?.status === 'ready'
      useEffect(() => {
        if (!fileReady || !visible) return undefined
        const onKey = (event) => {
          if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== 's') return
          const root = rootRef.current
          const active = document.activeElement
          if (root === null || active === null || !root.contains(active)) return
          event.preventDefault()
          void saveRef.current?.()
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
      }, [fileReady, visible])
      useEffect(() => {
        if (!dirty) return undefined
        const onBeforeUnload = (event) => {
          event.preventDefault()
          event.returnValue = ''
        }
        window.addEventListener('beforeunload', onBeforeUnload)
        return () => window.removeEventListener('beforeunload', onBeforeUnload)
      }, [dirty])

      const renderRows = (path, depth, output) => {
        const node = tree.nodes[path]
        if (node === undefined) return
        if (node.status === 'loading' && node.entries.length === 0) {
          output.push(statusRow(path, depth, node, t, () => { void loadDir(path) }))
          return
        }
        if (node.status === 'error') {
          output.push(statusRow(path, depth, node, t, () => { void loadDir(path) }))
          if (node.entries.length === 0) return
        }
        if (node.entries.length === 0) {
          output.push(h('div', {
            key: `empty:${path}`, className: 'wfe-indent-message', style: { paddingLeft: 26 + depth * 18 },
          }, t('empty')))
          return
        }
        for (const entry of node.entries) {
          const isDir = entry.type === 'directory'
          const open = isDir && expanded.includes(entry.path)
          output.push(h(TreeRow, {
            key: entry.path,
            entry,
            depth,
            open,
            current: entry.path === currentPath,
            onClick: () => { if (isDir) toggleDir(entry.path); else void openFile(entry.path) },
          }))
          if (open) renderRows(entry.path, depth + 1, output)
        }
      }

      const rows = useMemo(() => {
        const output = []
        if (rootPath !== undefined) renderRows(rootPath, 0, output)
        return output
      }, [tree, expanded, rootPath, currentPath, t])

      const noticeLine = notice === undefined ? null : h('div', {
        className: `wfe-notice${notice.tone === 'ok' ? ' wfe-notice-ok' : ''}`,
        role: notice.tone === 'ok' ? 'status' : 'alert',
      },
      h('span', { className: 'wfe-notice-text' }, notice.text),
      ...(notice.actions ?? []).map(action => h('button', {
        key: action.label, type: 'button', className: 'wfe-link-button', onClick: action.onClick,
      }, action.label)),
      h('button', {
        type: 'button', className: 'wfe-notice-close', 'aria-label': t('dismiss'), title: t('dismiss'),
        onClick: () => setNotice(undefined),
      }, h(IconClose)))

      const searchPanel = h('div', { className: 'wfe-search-panel' },
        h('div', { className: 'wfe-search-bar' },
          h('div', { className: 'wfe-segments', role: 'group', 'aria-label': t('search') },
            h('button', {
              type: 'button',
              className: `wfe-segment${searchMode === 'names' ? ' wfe-segment-on' : ''}`,
              'aria-pressed': searchMode === 'names',
              onClick: () => {
                setSearchMode('names')
                queueMicrotask(() => searchInputRef.current?.focus())
              },
            }, t('searchFiles')),
            h('button', {
              type: 'button',
              className: `wfe-segment${searchMode === 'content' ? ' wfe-segment-on' : ''}`,
              'aria-pressed': searchMode === 'content',
              onClick: () => {
                setSearchMode('content')
                queueMicrotask(() => searchInputRef.current?.focus())
              },
            }, t('searchContent'))),
          h('input', {
            ref: searchInputRef,
            className: 'wfe-search-input',
            value: searchText,
            placeholder: searchMode === 'names' ? t('searchFilesPlaceholder') : t('searchContentPlaceholder'),
            'aria-label': t('search'),
            onChange: (event) => setSearchText(event.target.value),
            onKeyDown: (event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                setSearchOpen(false)
              } else if (event.key === 'Enter' && searchResults !== undefined && searchResults.matches.length > 0) {
                event.preventDefault()
                openSearchResult(searchResults.matches[0])
              }
            },
          }),
          h(IconButton, { label: t('close'), onClick: () => setSearchOpen(false) }, h(IconClose))),
        h('div', { className: 'wfe-search-results' },
          searchState === 'loading'
            ? h(Message, { text: t('searching') })
            : searchState === 'error'
              ? h(Message, {
                text: errorText(t, searchError),
                tone: 'error',
                action: { label: t('retry'), onClick: () => setSearchTick((value) => value + 1) },
              })
              : searchText.trim().length === 0
                ? h(Message, { text: t('searchHint') })
                : searchResults === undefined || searchResults.matches.length === 0
                  ? h(Message, { text: t('noMatches') })
                  : h('div', { className: 'wfe-search-list', role: 'list' },
                    searchResults.matches.map((match, index) => h('button', {
                      key: `${match.relative}:${match.line ?? 0}:${index}`,
                      type: 'button',
                      className: 'wfe-search-row',
                      role: 'listitem',
                      onClick: () => openSearchResult(match),
                    },
                    h('span', { className: 'wfe-search-path' },
                      searchMode === 'content' && match.line !== undefined
                        ? `${match.relative}:${match.line}`
                        : match.relative),
                    searchMode === 'content' && match.text !== undefined
                      ? h('span', { className: 'wfe-search-preview' }, match.text.trim())
                      : null)),
                    searchResults.truncated
                      ? h('div', { className: 'wfe-search-note' }, t('searchTruncated'))
                      : null)))

      const body = (() => {
        if (cwd === undefined) {
          return h('div', { className: 'wfe-body' },
            cwdPending
              ? h(Message, { text: t('loadingWorkspace') })
              : h(Message, { text: t('noWorkspace') }))
        }
        if (mode === 'list') {
          if (searchOpen) {
            return h('div', { className: 'wfe-body' }, searchPanel)
          }
          if (rootPath === undefined || tree.nodes[rootPath] === undefined) {
            return h('div', { className: 'wfe-body' }, h(Message, { text: t('loading') }))
          }
          return h('div', { className: 'wfe-body' },
            h('div', { className: 'wfe-tree', role: 'group', 'aria-label': t('title') }, rows))
        }
        if (current === undefined) {
          return h('div', { className: 'wfe-body' }, h(Message, { text: t('loadingFile') }))
        }
        if (current.status === 'loading') {
          return h('div', { className: 'wfe-body' }, h(Message, { text: t('loadingFile') }))
        }
        if (current.status === 'error') {
          return h('div', { className: 'wfe-body' },
            h(Message, {
              text: errorText(t, current.error),
              tone: 'error',
              action: retryable(current.error)
                ? { label: t('retry'), onClick: () => { void reload() } }
                : undefined,
            }))
        }
        return h('div', { className: 'wfe-body wfe-editor wfe-editor-code', ref: editorRef },
          highlighted
            ? h('pre', {
              ref: highlightRef,
              className: 'wfe-highlight',
              'aria-hidden': 'true',
            }, highlightContent)
            : null,
          h('textarea', {
            ref: textareaRef,
            className: highlighted ? 'wfe-textarea wfe-textarea-veiled' : 'wfe-textarea',
            value: current.text,
            spellCheck: false,
            autoCapitalize: 'off',
            autoCorrect: 'off',
            wrap: 'off',
            'aria-label': baseName(current.path),
            onChange: (event) => {
              const programmatic = applyingRef.current
              if (!programmatic) {
                suppressRef.current = false
                suppressInlineRef.current = false
                completionUndoRef.current = undefined
              }
              typedRef.current = true
              const text = event.target.value
              abortInline()
              setInline(undefined)
              setCaretAt(event.target.selectionStart ?? 0)
              setCurrent((previous) => previous === undefined ? previous : { ...previous, text })
            },
            // IME composition must stay readable while it is being typed, so
            // both the highlight layer and the completion popup step aside.
            onCompositionStart: () => {
              abortInline()
              setInline(undefined)
              setComposing(true)
            },
            onCompositionEnd: (event) => {
              const text = event.target.value
              typedRef.current = true
              suppressInlineRef.current = false
              completionUndoRef.current = undefined
              abortInline()
              setInline(undefined)
              setComposing(false)
              setCaretAt(event.target.selectionStart ?? 0)
              setCurrent((previous) => previous === undefined ? previous : { ...previous, text })
            },
            onSelect: (event) => setCaretAt(event.currentTarget.selectionStart ?? 0),
            onClick: (event) => {
              setCaretAt(event.currentTarget.selectionStart ?? 0)
              abortInline()
              setInline(undefined)
            },
            onKeyUp: (event) => {
              if (!/^(?:Arrow|Home$|End$|Page)/.test(event.key)) return
              abortInline()
              setInline(undefined)
            },
            onBlur: () => {
              abortInline()
              setInline(undefined)
              setCompletion(undefined)
            },
            onScroll: () => {
              syncScroll()
              // Follow the caret's new screen position instead of closing while
              // typing near the bottom of the viewport.
              setScrollTick((value) => value + 1)
            },
            onKeyDown: onEditorKeyDown,
          }),
          findOpen && findBox !== undefined ? h('div', {
            className: 'wfe-find-highlight',
            style: {
              left: `${findBox.x}px`,
              top: `${findBox.y}px`,
              width: `${findBox.width}px`,
              height: `${findBox.height}px`,
            },
            'aria-hidden': 'true',
          }) : null,
          inline !== undefined && ghostBox !== undefined ? h('div', {
            className: 'wfe-ghost',
            style: {
              left: `${ghostBox.x}px`,
              top: `${ghostBox.y}px`,
              width: `${ghostBox.width}px`,
              maxHeight: `${ghostBox.height}px`,
            },
            'aria-hidden': 'true',
          }, inline.text) : null,
          completion === undefined ? null : h('div', {
            className: 'wfe-completion',
            style: { left: `${completion.x}px`, top: `${completion.y}px`, width: `${completion.width}px` },
            role: 'listbox',
            'aria-label': t('completions'),
          }, completion.items.map((item, index) => h('div', {
            key: item,
            role: 'option',
            'aria-selected': index === completion.index,
            className: `wfe-completion-item${index === completion.index ? ' wfe-completion-active' : ''}`,
            onMouseDown: (event) => {
              event.preventDefault()
              acceptCompletion(index)
            },
          },
          h('span', { className: 'wfe-completion-word' },
            completion.prefix.length > 0
              ? h('span', { className: 'wfe-completion-match' }, item.slice(0, completion.prefix.length))
              : null,
            completion.prefix.length > 0 ? item.slice(completion.prefix.length) : item),
          index === completion.index
            ? h('span', { className: 'wfe-completion-hint' }, 'Tab')
            : null))))
      })()

      const bar = mode === 'list'
        ? h('div', { className: 'wfe-bar' },
          h('span', { className: 'wfe-title' },
            h('span', { className: 'wfe-name' }, t('title')),
            h('span', { className: 'wfe-sub', title: rootPath }, rootPath ?? '')),
          h(IconButton, {
            label: t('search'),
            onClick: () => setSearchOpen((value) => !value),
          }, h(IconSearch)),
          h(IconButton, {
            label: t('refresh'), disabled: rootPath === undefined,
            onClick: () => { if (rootPath !== undefined) refreshAll() },
          }, h(IconRefresh)))
        : h('div', { className: 'wfe-bar' },
          h(IconButton, { label: t('back'), onClick: back }, h(IconArrowLeft)),
          h('span', { className: 'wfe-title' },
            h('span', { className: 'wfe-name', title: current?.path }, baseName(current?.path)),
            h('span', { className: 'wfe-sub', title: current?.path }, relativeTo(rootPath, current?.path))),
          h(IconButton, { label: t('find'), onClick: openFind }, h(IconSearch)),
          h(IconButton, { label: t('reload'), disabled: saving, onClick: () => { void reload() } }, h(IconRefresh)),
          h('button', {
            type: 'button', className: 'wfe-save', disabled: !dirty || saving, onClick: () => { void save() },
          }, saving ? t('saving') : t('save')))

      const findBar = mode === 'editor' && findOpen && current?.status === 'ready'
        ? h('div', { className: 'wfe-find' },
          h('input', {
            ref: findInputRef,
            className: 'wfe-find-input',
            value: findQuery,
            placeholder: t('findPlaceholder'),
            'aria-label': t('find'),
            onChange: (event) => {
              setFindQuery(event.target.value)
              setFindIndex(0)
            },
            onKeyDown: (event) => {
              if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'f') {
                event.preventDefault()
                return
              }
              if (event.key === 'Enter') {
                event.preventDefault()
                setFindIndex((value) => value + (event.shiftKey ? -1 : 1))
              } else if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                closeFind()
              }
            },
          }),
          h('span', { className: 'wfe-find-count' }, findMatches.length === 0
            ? '0/0'
            : `${(((findIndex % findMatches.length) + findMatches.length) % findMatches.length) + 1}/${findMatches.length}`),
          h(IconButton, { label: t('findPrev'), onClick: () => setFindIndex((value) => value - 1) }, h(IconArrowUp)),
          h(IconButton, { label: t('findNext'), onClick: () => setFindIndex((value) => value + 1) }, h(IconArrowDown)),
          h(IconButton, { label: t('close'), onClick: closeFind }, h(IconClose)))
        : null

      const sizeLabel = current?.size === null || current?.size === undefined
        ? null
        : current.size >= 1024 * 1024
          ? `${(current.size / 1024 / 1024).toFixed(1)} MB`
          : `${Math.max(1, Math.round(current.size / 1024))} KB`

      const footer = mode !== 'editor' || current === undefined || current.status !== 'ready'
        ? null
        : h('div', { className: 'wfe-footer' },
          h('span', { className: 'wfe-footer-path', title: current.path }, current.path),
          current.mixed === true
            ? h('span', {
              className: 'wfe-footer-note',
              title: t('mixedEolHint', { eol: String(current.eol).toUpperCase() }),
            }, t('mixedEol'))
            : null,
          sizeLabel === null
            ? null
            : h('span', {
              className: 'wfe-footer-size',
              title: current.size > 512 * 1024 ? t('sizeBig', { size: Math.round(current.size / 1024) }) : undefined,
            }, sizeLabel),
          h('span', { className: dirty ? 'wfe-footer-state wfe-dirty' : 'wfe-footer-state' },
            dirty ? t('dirty') : t('clean')),
          h('span', { className: 'wfe-footer-hint' }, inline !== undefined ? t('inlineHint') : SAVE_HINT))

      return h('div', { className: 'wfe-root', ref: rootRef },
        h('style', null, CSS),
        bar,
        findBar,
        noticeLine,
        body,
        footer)
    }

    const CSS = `
.wfe-root { display: flex; flex-direction: column; height: 100%; min-height: 0; color: var(--dsw-alias-label-primary); font-size: var(--dsh-content-font-size-secondary, 13px); line-height: 1.5; }
.wfe-bar { display: flex; align-items: center; gap: 4px; flex: none; min-height: 42px; padding: 6px 8px; box-sizing: border-box; border-bottom: 0.5px solid var(--dsw-alias-border-l3); }
.wfe-title { display: flex; flex-direction: column; justify-content: center; gap: 1px; flex: 1; min-width: 0; padding: 0 2px; }
.wfe-name { font-size: 13px; font-weight: 600; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wfe-sub { font-size: 11px; line-height: 1.35; color: var(--dsw-alias-label-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wfe-icon-btn { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 28px; height: 28px; padding: 0; border: 0; border-radius: var(--dsw-radius-md); background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }
@media (hover: hover) { .wfe-icon-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); } }
.wfe-icon-btn:disabled { opacity: .4; cursor: default; }
.wfe-save { flex: none; margin-left: 2px; padding: 5px 12px; border: 0; border-radius: var(--dsw-radius-md); background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
@media (hover: hover) { .wfe-save:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); } }
.wfe-save:disabled { opacity: .4; cursor: default; }
.wfe-icon-btn:focus-visible, .wfe-save:focus-visible, .wfe-row:focus-visible, .wfe-link-button:focus-visible, .wfe-notice-close:focus-visible, .wfe-segment:focus-visible, .wfe-search-row:focus-visible { outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: -2px; }
.wfe-body { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.wfe-editor { flex: 1; }
.wfe-tree { flex: 1; min-height: 0; overflow: auto; padding: 4px 6px 14px; }
.wfe-row { display: flex; align-items: center; gap: 6px; width: 100%; min-width: 0; box-sizing: border-box; min-height: 28px; padding: 5px 10px; border: 0; border-radius: var(--dsw-radius-md); background: transparent; color: inherit; font: inherit; font-size: var(--dsh-content-font-size-secondary, 13px); text-align: left; cursor: pointer; }
@media (hover: hover) { .wfe-row:hover { background: var(--dsw-alias-interactive-bg-hover); } .wfe-row-current:hover { background: var(--dsw-alias-interactive-bg-active); } }
.wfe-row-current { background: var(--dsw-alias-interactive-bg-active); }
.wfe-row-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wfe-chevron { display: inline-flex; flex: none; color: var(--dsw-alias-label-tertiary); transition: transform .12s ease; }
.wfe-chevron-open { transform: rotate(90deg); }
.wfe-chevron-space { display: inline-block; flex: none; width: 12px; }
.wfe-glyph { display: inline-flex; flex: none; color: var(--dsw-alias-label-tertiary); }
.wfe-message { display: flex; align-items: flex-start; gap: 7px; margin: 0; padding: 18px 14px; color: var(--dsw-alias-label-secondary); font-size: inherit; line-height: 1.6; }
.wfe-message-error { color: var(--dsw-alias-state-error-primary); }
.wfe-message-icon { display: inline-flex; flex: none; padding-top: 1px; }
.wfe-message-text { min-width: 0; overflow-wrap: anywhere; }
.wfe-message .wfe-link-button { margin-left: 6px; }
.wfe-indent-message { padding: 4px 8px 8px; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 1.5; }
.wfe-indent-message.wfe-message-error { color: var(--dsw-alias-state-error-primary); }
.wfe-link-button { padding: 0; border: 0; background: none; color: var(--dsw-alias-brand-primary); font: inherit; font-size: 12px; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
.wfe-notice { display: flex; align-items: center; gap: 10px; flex: none; padding: 6px 12px; border-bottom: 0.5px solid var(--dsw-alias-border-l3); font-size: 12px; line-height: 1.5; color: var(--dsw-alias-state-error-primary); }
.wfe-notice-ok { color: var(--dsw-alias-state-success-primary); }
.wfe-notice-text { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.wfe-notice .wfe-link-button { flex: none; }
.wfe-notice-close { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 22px; height: 22px; padding: 0; border: 0; border-radius: var(--dsw-radius-md); background: transparent; color: inherit; opacity: .7; cursor: pointer; }
@media (hover: hover) { .wfe-notice-close:hover { opacity: 1; background: var(--dsw-alias-interactive-bg-hover); } }
.wfe-textarea { flex: 1; min-height: 0; width: 100%; box-sizing: border-box; padding: 10px 12px; border: 0; resize: none; background: transparent; color: var(--dsw-alias-label-primary); font-family: ui-monospace, "Cascadia Code", Consolas, "Liberation Mono", monospace; font-size: 12.5px; line-height: 1.55; tab-size: 2; white-space: pre; outline: none; }
.wfe-textarea:focus-visible { outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: -2px; }
/* The token layer and the textarea must agree on every typographic box, or the
   colored glyphs drift away from the caret. */
.wfe-editor-code { position: relative; }
.wfe-highlight { position: absolute; inset: 0; margin: 0; padding: 10px 12px; box-sizing: border-box; border: 0; overflow: hidden; background: transparent; color: var(--dsw-alias-label-primary); font-family: ui-monospace, "Cascadia Code", Consolas, "Liberation Mono", monospace; font-size: 12.5px; line-height: 1.55; tab-size: 2; white-space: pre; pointer-events: none; }
.wfe-textarea-veiled { position: relative; z-index: 1; color: transparent; caret-color: var(--dsw-alias-label-primary); }
.wfe-ghost { position: absolute; z-index: 2; overflow: hidden; pointer-events: none; white-space: pre; color: var(--dsw-alias-label-secondary); opacity: .5; font-family: ui-monospace, "Cascadia Code", Consolas, "Liberation Mono", monospace; font-size: 12.5px; font-style: italic; line-height: 1.55; tab-size: 2; }
.wfe-find-highlight { position: absolute; z-index: 3; pointer-events: none; border-radius: 2px; background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 30%, transparent); }
.wfe-completion { position: absolute; z-index: 20; box-sizing: border-box; max-height: 220px; overflow: auto; padding: 4px; border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-overlay); box-shadow: var(--dsw-elevation-panel, var(--dsw-shadow-lv2)); }
.wfe-completion-item { display: flex; align-items: center; gap: 8px; box-sizing: border-box; min-height: 26px; padding: 3px 8px; border-radius: 6px; color: var(--dsw-alias-label-primary); font-family: ui-monospace, "Cascadia Code", Consolas, "Liberation Mono", monospace; font-size: 12.5px; line-height: 1.4; cursor: pointer; }
@media (hover: hover) { .wfe-completion-item:hover { background: var(--dsw-alias-interactive-bg-hover); } }
.wfe-completion-active, .wfe-completion-active:hover { background: var(--dsw-alias-interactive-bg-active); }
.wfe-completion-word { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wfe-completion-match { color: var(--dsw-alias-brand-primary); font-weight: 600; }
.wfe-completion-hint { flex: none; padding: 0 4px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: 4px; color: var(--dsw-alias-label-secondary); font-size: 10px; line-height: 15px; }
.wfe-search-panel { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.wfe-search-bar { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; flex: none; padding: 8px; border-bottom: 0.5px solid var(--dsw-alias-border-l3); }
.wfe-segments { display: inline-flex; flex: none; padding: 2px; gap: 2px; border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-2); }
.wfe-segment { padding: 3px 9px; border: 0; border-radius: calc(var(--dsw-radius-md) - 3px); background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 11px; cursor: pointer; }
.wfe-segment-on { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); box-shadow: var(--dsw-elevation-panel, none); }
@media (hover: hover) { .wfe-segment:hover { color: var(--dsw-alias-label-primary); } }
.wfe-search-input, .wfe-find-input { flex: 1; min-width: 100px; height: 28px; box-sizing: border-box; padding: 0 8px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; outline: none; }
.wfe-search-input:focus-visible, .wfe-find-input:focus-visible { outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: -1px; }
.wfe-search-results { flex: 1; min-height: 0; overflow: auto; padding: 4px 6px 12px; }
.wfe-search-list { display: flex; flex-direction: column; gap: 1px; }
.wfe-search-row { display: flex; flex-direction: column; gap: 2px; width: 100%; min-width: 0; box-sizing: border-box; padding: 6px 8px; border: 0; border-radius: var(--dsw-radius-md); background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
@media (hover: hover) { .wfe-search-row:hover { background: var(--dsw-alias-interactive-bg-hover); } }
.wfe-search-path { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-primary); font-size: 12.5px; }
.wfe-search-preview { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-secondary); font-family: ui-monospace, "Cascadia Code", Consolas, "Liberation Mono", monospace; font-size: 11px; }
.wfe-search-note { padding: 8px; color: var(--dsw-alias-label-secondary); font-size: 11px; }
.wfe-find { display: flex; align-items: center; gap: 6px; flex: none; padding: 6px 8px; border-bottom: 0.5px solid var(--dsw-alias-border-l3); }
.wfe-find-count { flex: none; color: var(--dsw-alias-label-secondary); font-size: 11px; font-variant-numeric: tabular-nums; }
.wfe-footer { display: flex; align-items: center; gap: 10px; flex: none; min-height: 26px; padding: 4px 10px; box-sizing: border-box; border-top: 0.5px solid var(--dsw-alias-border-l3); color: var(--dsw-alias-label-secondary); font-size: 11px; }
.wfe-footer-path { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wfe-footer-note { flex: none; color: var(--dsw-alias-state-warn-primary); }
.wfe-footer-size { flex: none; }
.wfe-footer-state { flex: none; }
.wfe-footer-hint { flex: none; opacity: .7; }
.wfe-dirty { color: var(--dsw-alias-state-warn-primary); }
`

    const OPEN_BUTTON_CSS = `
.wfe-open-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: var(--dsw-radius-md); background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }
@media (hover: hover) { .wfe-open-btn:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); } }
.wfe-open-btn:focus-visible { outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: -2px; }
`

    return {
      inject: ['slots', 'locale', 'sidebarRightTabs', 'sidebarRight', 'shortcuts'],
      apply(ctx) {
        const t = ctx.locale.bind(NS)
        const openEditorButton = () => h(React.Fragment, null,
          h('style', null, OPEN_BUTTON_CSS),
          h('button', {
            type: 'button', className: 'wfe-open-btn',
            'aria-label': t('openEditor'), title: t('openEditor'),
            onClick: () => { ctx.sidebarRight.openTab(KIND) },
          }, h(IconPencil)))
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'workspace-file-editor: copy')
        ctx.effect(() => ctx.sidebarRightTabs.register({
          id: ID,
          kind: KIND,
          priority: 'extension',
          keepMounted: true,
          title: () => t('tab.title'),
          guide: [{
            id: 'edit',
            commandId: 'workspace.files.edit',
            order: 15,
            title: () => t('guide.title'),
            description: () => t('guide.description'),
            icon: EditorArtwork,
          }],
        }), 'workspace-file-editor: tab type')
        ctx.effect(() => ctx.shortcuts.register({
          id: 'workspace.files.edit',
          label: () => t('guide.title'),
          aliases: ['workspace files edit', 'edit file', 'file editor'],
          defaults: {
            'desktop:macos': { code: 'KeyE', modifiers: ['primary', 'alt'] },
            'desktop:windows': { code: 'KeyE', modifiers: ['primary', 'alt'] },
            'desktop:linux': { code: 'KeyE', modifiers: ['primary', 'alt'] },
            'web:macos': { code: 'KeyE', modifiers: ['primary', 'alt'] },
            'web:windows': { code: 'KeyE', modifiers: ['primary', 'alt'] },
          },
          regions: ['page', 'editable', 'terminal'], modals: [],
          resolve: ({ target: element }) => {
            const target = ctx.sidebarRight.commandTarget(element)
            if (target === undefined) return { status: 'blocked', reason: t('shortcut.noSession') }
            return { status: 'handled', run: () => { ctx.sidebarRight.openTabFromTarget(KIND, target) } }
          },
        }), 'workspace-file-editor: shortcut')
        ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
          name: 'sidebar.right.pane.tab', key: ID, locale: NS,
        }, WorkspaceFileEditor)), 'workspace-file-editor: tab body')
        ctx.effect(() => ctx.slots.inject('sidebar.right.tab.files.actions', () => ctx.slots.register({
          name: 'sidebar.right.tab.files.actions', id: 'workspace-file-editor-open', order: 10,
        }, openEditorButton)), 'workspace-file-editor: files action')
      },
    }
  },
})
