> ## **WIP**

# tr-redux

mock redux store for reactive magic

## Motivation

### Problems

- Selectors are not inspectable (i mean reducers results may inspect in devtools). (It is the common reason for me)
- Separation of model - to reducers and selectors
- Selectors must know about all parents - path to the root. It hard for modular architecture
- Difficult static type inference
- Selectors - is **manual** API to state. It must be **manualy** memorized - and you always need to think when you need it or not (it one of the reasons of performance problems)
- classic API reducer is had much boilerplate and [static] type description boilerplate
- A part of problems solves by various fabric functions, but without standardization it is harmful

### Goals

- Reducers may depend on other reducers
- Each reducer must know and react only to depended actions
- No glitches
- No breaking changes (at all)
- Try to no increase bundle size (with tree-shaking)

## Example

[![tr-redux example](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/rw8mj4py8q) Todo-list

> Also see tests

## TODO

- time travel
- friendly DX for work with collections
