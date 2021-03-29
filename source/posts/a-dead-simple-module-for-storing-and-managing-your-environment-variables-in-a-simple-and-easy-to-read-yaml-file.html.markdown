---
layout: post
title: A dead simple module for storing and managing your environment variables in a simple and easy to read yaml file
permalink: a-dead-simple-module-for-storing-and-managing-your-environment-variables-in-a-simple-and-easy-to-read-yaml-file
description: A dead simple Nodejs module for managing your environments
date: '2021-03-18 10:30:00'
---

Managing your environment variable in your different environments can be a pain. The idea behind `envz` is that this process is made super simple and easy to understand leading to less mistakes.

``` bash
# with npm
npm install envz

# or with Yarn
yarn add envz
```
dsds

Repo: [https://github.com/mrvautin/envz](https://github.com/mrvautin/envz)

## Usage

You should use `envz` as early on in the entry point of your app as possible. Eg: `app.js` or `index.js` file which loads your app. 

Rather than override `process.env.x` object, `envz` will return a new object to use throughout your app. 

``` javascript
const { envz } = require('envz');
```

Create a `env.yaml` or any other named file and load it:

``` javascript
const env = envz('env.yaml');
```

## env YAML file structure

The idea is that the `process.env` will be merged with loaded `yaml` file. 

`env` uses a cascading (sequential order) configuration method which is easier to understand looking at an example.

``` yaml
base:
  PORT: 1234
  config:
    default: test

development:
  PORT: 3000
  DATABASE: dev
  config:
    token: 12345
    secret: fwdsdgl

production:
  PORT: 80
  DATABASE: prod
  config:
    token: 67890
    key: puwndklf
    truthy: true
    allowed:
      - card
      - phone
```

The idea here is that the values in `base` are loaded, anything in `development` overrides that and finally `production` overrides that depending on the `NODE_ENV` set.

For example, when a `NODE_ENV` of `development` is set the following `env` object is returned:

```
PORT: 3000,
config: { 
    default: 'test', 
    token: 12345, 
    secret: 'fwdsdgl' 
},
DATABASE: 'dev'
...
```

Eg: Where the `PORT` of 3000 from `development` overrides the `base` setting of 1234. If the `NODE_ENV` is set to `production`, then the `PORT` will be set to 80.

The idea behind `base` (or whatever you want to call it) is that you don't need to redefine defaults over and over for each environment.

## Options

You can set the environment manually rather than using `NODE_ENV` by adding an `environment` object. Eg:

``` javascript
const env = envz('env.yaml', { environment: 'production' });
```

By default the values set in `process.env` overrides what is set in your yaml file. You can change this so that the yaml file is king by adding the following flag:

``` javascript
const env = envz('env.yaml', { yamlFileOverride: true });
```

## Save / Update config

Sometimes you may want to store changes back to your `envz` config. You can easily do this by importing `save`:

``` javascript
const { save } = require('envz');
```

The `save` method takes an object with two values:

- `envfile`: The yaml file you are wanting to update
- `data`: The object you want to update back to the file. See tests and example below.

``` javascript
// In this case we will be adding to the `base` config but you can easily
// replace `base` with `production` or whatever environment.
const saveObj = await save({
    envfile: 'test.yaml',
    data: {
      base: {
        config: {
            default: 'default-key'
        }
      }
    }
});
```

This will result in the `test.yaml` being updated:

``` yaml
base:
  PORT: 1234
  config:
    default: default-key
...
```