> ## **WIP**

# tr-redux

mock redux store for reactive magic

## Motivation

### Problems

- Selectors are not inspectable (i mean reducers results may inspect in devtools). (It is the common reason for me)
- Selectors execute at render - error in selector will break render (computed properties must separeted from view)
- Separation of model - to reducers and selectors
- Selectors must know about all parents - path to the root. It hard for modular architecture
- Memorized selectors is extra computations by default, but it is defenetly unnecessary in SSR
- Difficult static type inference
- Selectors - is **manual** API to state. It must be **manualy** memorized - and you always need to think when you need it or not (it one of the reasons of performance problems)
- classic API reducer is had much boilerplate and [static] type description boilerplate
- Selectors "runtime" oriented, mean if some "feature" use any part of state (by selector) when you will remove that part, you get the error only when you will try to mount your "feature" at runtime (if you have not static typing). Right way - is connect all features staticaly by imports.
- A part of problems solves by various fabric functions, but without standardization it is harmful

### Goals

- Reducers may depend on other reducers
- Each reducer must know and react only to depended actions
- No glitches
- No breaking changes (at all)
- Try to no increase bundle size (with tree-shaking)

## Example

[![tr-redux example](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/5k8zjyo3l) Todo-list

> Also see tests

## TODO

- time travel
- friendly DX for work with collections
