# postlink

auto `npm link` your npm packages after `npm install`.  

## Why do you need npm link ?

You have a `bar` package depending on `foo` and you want to keep `bar/node_modules/foo` in sync with `../foo`

## How to npm link foo ?

- You run npm link directly : `npm link ../foo`
- Or you run it postintsall : in `bar/package.json` you add `"scripts": {"postinstall": "npm link ../foo"}`

## What postlink does ?

It read dependencies in `bar/package.json` and `npm link` all packages found in a folder you can define.  
This way you don't have to pollute your package.json with tons of npm link hard to maintain.

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
- `npm install` or `npm run postinstall`


