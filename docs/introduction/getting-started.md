# Getting started with Pundle

Pundle is the next generation Javascript module bundler. Pundle allows you to bundle your Javascript project for usage in web browsers, allowing you to use hundreds of thousands of npm packages directly in your project. Every part of Pundle is a configurable Component so you can swap them in and out as you like.

Pundle has very predictable configurations, every configuration is isolated and enabling one option does not require setting another as well (You're welcome Webpack users).

## Setting it up

You can install Pundle from npm

```
npm install -g pundle-cli@latest
```

To get started with Pundle, simply create a new directory, cd into it and execute `pundle init`. It will setup an example app with a basic configuration file. If you want a configuration file with all possible fields shown do `pundle init full`.

Doing so will do these steps in the current directory, without overwriting any previous files

- Create a manifest file (`package.json`)
- Create a configuration file (`.pundle.js`)
- Create an entry point `index.js`
- Create an HTML file `static/index.html`

That's it. You now have a full blown Pundle project. Make sure to run `npm install` to install any dependencies before kicking up the server.

**Note**: Everything put in the `static` folder is exposed via the dev server so be careful about what you put it in there.

## Usage

To compile your files statically, for deployment purposes use

```
pundle
# or
npm run compile
```

To boot up the development server, do

```
pundle --dev
# or
npm run dev
```

**Note**: The npm scripts above will only work if the `package.json` file in your root directory was created by Pundle.


---

[Documentation Home](../) | [Configuration](configuration.md) | [CLI Usage](cli-usage.md)
