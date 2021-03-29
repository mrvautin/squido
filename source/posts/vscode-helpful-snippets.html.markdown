---
layout: post
title: Visual Studio Code helpful snippets
permalink: visual-studio-code-helpful-snippets
description: Visual studio snippets and helpers to make writing code easier
date: '2021-03-11 19:17:00'
---

If you are using VS Code its a huge shame if you aren't making use of the amazingly helpful snippets feature.

Setting up snippets is easy as:

**Mac1**

`Code > Preferences > User Snippets > Select a file or create a new one`

**Windows**

`File > Preferences > User Snippets > Select a file or create a new one`


Once setup, snippets are triggered by pressing:

`CTRL+Space`

![Snippet menu](/content/images/vscode-snippet-menu.png)

Sometimes its easier to look at an example for the Snippets syntax.

A simple `console.log` can be sped up using the following syntax. Once triggered the snippet will create a `console.log` line and drop your cursor into the middle with single quotes wrapping.

``` json
{
    "Console log": {
        "scope": "javascript,typescript",
        "prefix": "log",
        "body": [
            "console.log('$1');"
        ],
        "description": "Log output to console"
    }
}
```

- **Scope:** The file types this snippet is used for
- **Prefix:** The snippet name when the snippet menu is opened
- **Body:** The main part of the snippet driving the code
- **Description:** The description of the snippet

## Console logging

Simple console logging of text:

``` json
{
    "Console log": {
        "scope": "javascript,typescript",
        "prefix": "log",
        "body": [
            "console.log('$1');"
        ],
        "description": "Log output to console"
    }
}
```

Quick and easy logging of the variable in your clipboard.

``` javascript
{
    "Console log variable": {
		"scope": "javascript,typescript",
		"prefix": "log var",
		"body": [
			"console.log('${CLIPBOARD}', ${CLIPBOARD});"
		],
		"description": "Console log variable"
	}
}
```

## Loops

Quick for loop

``` json
{
    "For Loop": {
        "prefix": ["for", "for-const"],
        "body": ["for (const ${2:element} of ${1:array}) {", "\t$0", "}"],
        "description": "A for loop."
    }
}
```

## Wrapping text

Wrapping code blocks in the markdown code block syntax

``` json
{
    "Syntax highlighting": {
        "scope": "markdown",
        "prefix": "highlight",
        "body": [
            "``` javascript",
            "${TM_SELECTED_TEXT}",
            "```"
        ],
        "description": "Markdown highlight syntax"
    }
}
```

> For more information on variables available see the official snippet [docs](https://code.visualstudio.com/docs/editor/userdefinedsnippets).