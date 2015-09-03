# postlink

auto `npm link` your npm packages after `npm install`

## Why do you need npm link ?

A `bar` package depends on a `foo` package and you want `node_modules/foo` to stay in sync with `${HOME}/foo`

## How would you npm link foo ?

It can be done using `npm link ${HOME}/foo`.  
The right way to do is to run npm link postinstall by adding it to your package.json scripts.

## What postlink does ?

It prevents you from having to maintain npm link calls in your `package.json`.  
It read dependencies from `package.json` and `npm link` all packages found in a folder you can define.  

## How to use

In your `package.json` add postlink as dependency and run it postinstall

```json
{
    "dependencies": {
        "postlink": "*"
    },
    "scripts": {
        "postinstall": "postlink"
    }
}
```

Define the folder containing your npm packages : `npm config set postlink_path "${HOME}"`.  
postlink now runs after `npm install` ensuring `node_modules/*` packages are in sync with `${HOME}/*`

## Defining the folder containing npm packages

This config value is set using : `npm config set postlink_path {value}`.  
You can define many folders : `npm config set postlink_path "${HOME}/GitHub;${HOME}/npm_packages"` 
