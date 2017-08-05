# CLI Usage

Pundle comes with two CLI's, a basic one under `pundle-cli` that will just read your config and either run/build your app.

It also comes with a more opinionated CLI that aims to include helpful presets, called motion ([learn more about motion here](motion.md)).

These docs apply to `pundle-cli`, which you can install by reading the [getting started docs](getting-started.md).

Here is the latest version of the pundle-cli commands:

```sh
Usage: pundle [command...] [options]

Options:
   --help                                    Print usage information
   --version                                 Print version information
   -r, --root-directory       [directory]    Root path where Pundle config file exists
   -c, --config-file-name     [name]         Name of Pundle config file (defaults to .pundle.js)
   -d, --dev                                 Enable dev http server
   -p, --port                 [port]         Port for dev server to listen on
   --server-root-directory    [dir]          Directory to use as root for dev server
   --disable-cache                           Disable use of dev server cache
   --debug                                   Enable stack traces of errors, useful for debugging

Commands:
   init     [type]               Initialize current directory
   new      [name],[type]        Copy default Pundle configuration into new directory (type can be full or basic, defaults to basic)
   build    [outputDirectory]    Build your app to outputDirectory
```
