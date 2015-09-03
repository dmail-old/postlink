# postlink

auto `npm link` your npm packages after `npm install`

## Why do you need npm link ?

You have a `bar` package depending on `foo` and you want to keep `node_modules/foo` in sync with `${HOME}/foo`

## How to npm link foo ?

- You run npm link directly : `npm link ${HOME}/foo`
- Or you run it postintsall : in `package.json` you add `"scripts": {"postinstall": "npm link ${HOME}/foo"}`

## What postlink does ?

It would read dependencies from `package.json` and `npm link` all packages found in a folder you can define.  
This way you don't have to maintain tons of npm link in `package.json`.

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

postlink now runs after `npm install` ensuring `node_modules/*` packages are **in sync with `${HOME}/*`**

## Defining the folder containing npm packages

This config value is set using : `npm config set postlink_path {value}`.  
You can define many folders : `npm config set postlink_path "${HOME}/GitHub;${HOME}/npm_packages"` 
