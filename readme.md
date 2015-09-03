# postlink

auto `npm link` your npm packages after `npm install`.  

## Why do you need npm link ?

Imagine you have :

- A `bar` package depending on `foo`
- The `foo` package exists on your filesystem at `../foo`

You want to keep `bar/node_modules/foo` in sync with `../foo`.  
You go in `bar/package.json` and you run postinstall : `npm link ../foo`

## So why postinstall ?

Because you can define where all your local packages are located

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

- Define the folder containing your npm packages : `npm config set postlink_path "${HOME}/GitHub"`
- Run : `npm install` or `npm run postinstall`

It will read the dependencies from `package.json` and `npm link` all packages found in `${HOME}/GitHub`.
