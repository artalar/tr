![image](https://user-images.githubusercontent.com/27290320/50466652-e8224e80-09af-11e9-92db-22ea677ece70.png)

> ## **WIP**

# tr-reducer

Set of utils for reactive programming

## Motivation

### Goals
- to low boilerplate
- automaticaly dependency tracking without glitches (вместо мемоизации)
- type inferetance

<!--
```javascript
function getFirstName(data) {
  return data.firstName;
}
function getLastName(data) {
  return data.lastName;
}
function getFullName(firstName, lastName) {
  return `${firstName} ${lastName}`;
}
function getDisplayName(firstName, fullName) {
  return firstName.length < 10 ? fullName : firstName;
}

// ------------------------------------------------

// ### push-based
// - **benefits** - high performance
// - **problems** - high coupling

function fetchResponse(data) {
  const firstName = getFirstName(data);
  const lastName = getLastName(data);
  const fullName = getFullName(data);
  const displayName = getDisplayName(firstName, fullName);

  return { firstName, lastName, fullName, displayName };
}

// ------------------------------------------------

// ### pull-based
// - **benefits** - low coupling
// - **problems** - a little bit less performance from API overhead.
//     Recall of rhombus dependencies (glitches).
// > execution order:
// > fetchResponse ->
// >     firstName ->
// >         fullName ->
// >             displayName ->
// >     lastName ->
// >         fullName ->
// >             displayName ->

const fetchResponse$ = new Observer();
const firstName$ = Observer.from(fetchResponse$).map(getFirstName);
const lastName$ = Observer.from(fetchResponse$).map(getLastName);
const fullName$ = Observer.from(firstName$, lastName$).map(getFullName);
const displayName$ = Observer.from(firstName$, fullName$).map(getDisplayName);

// ------------------------------------------------

// ## **`tr`**
// ### push-based with pull-based API
// - **benefits** - low coupling, almost native (push-based) performance (initial time dependency composition)
// - **problems** - dependencies tree locked for removing nodes
// execution order:
// > fetchResponse ->
// >     firstName ->
// >     lastName ->
// >         fullName ->
// >             displayName ->

const FETCH_RESPONSE = 'FETCH_RESPONSE';
const firstName$ = new Tr().on('FETCH_RESPONSE', getFirstName);
const lastName$ = new Tr().on('FETCH_RESPONSE', getLastName);
const fullName$ = new Tr().compute(firstName$, lastName$, getFullName);
const displayName$ = new Tr().compute(firstName$, fullName$, getDisplayName);
```

> **For more examples see [tests](src/__tests__/index.js)**
-->