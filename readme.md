# postlink

auto `npm link` your npm packages after `npm install`

## Reminder about npm link

A `bar` package depends on a `foo` package and you want `node_modules/foo` to stay in sync with `${HOME}/foo`.  
To achieve this goal you run the command : `npm link ${HOME}/foo`.  
Because you want to automate this npm link command a common practice consist into adding it in the scripts, postinstall section, of your `package.json`.

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
