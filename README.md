![image](https://user-images.githubusercontent.com/27290320/50466652-e8224e80-09af-11e9-92db-22ea677ece70.png)

# **WIP**

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
// problem - high coupling

function fetchResponse(data) {
  const firstName = getFirstName(data);
  const lastName = getLastName(data);
  const fullName = getFullName(data);
  const displayName = getDisplayName(firstName, fullName);

  return { firstName, lastName, fullName, displayName };
}

// ------------------------------------------------

// ### pull-based
// execution order:
// > fetchResponse ->
// >     firstName ->
// >         fullName ->
// >             displayName ->
// >     lastName ->
// >         fullName ->
// >             displayName ->
//
// problem - recall of dependencies (glitches)

const fetchResponse$ = createObservable();
const firstName$ = createObservable([fetchResponse$], getFirstName);
const lastName$ = createObservable([fetchResponse$], getLastName);
const fullName$ = createObservable([firstName$, lastName$], getFullName);
const displayName$ = createObservable([firstName$, fullName$], getDisplayName);

// ------------------------------------------------

// ### pull-based with **`tr`**
// execution order:
// > fetchResponse ->
// >     firstName ->
// >     lastName ->
// >         fullName ->
// >             displayName ->
//
// problems solved

const fetchResponse = createStarter();
const firstName = fold([fetchResponse], getFirstName);
const lastName = fold([fetchResponse], getLastName);
const fullName = fold([firstName, lastName], getFullName);
const displayName = fold([firstName, fullName], getDisplayName);

```
