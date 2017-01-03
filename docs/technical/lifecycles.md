# Pundle LifeCycles

Pundle has several different lifecycles, some will be illustrated here to get you a better understanding of how things work under the hood. Understanding these lifecycles is very important to writing Components for Pundle.

## Compile Single

The lifecycle of events executed when `pundle.compilation.processFile(...)` is invoked are illustrated below.

<img src="https://cloud.githubusercontent.com/assets/4278113/21468937/dfa3cd32-c9e3-11e6-9fd2-ae0045c607e2.png" />

## Compile Many

The lifecycle of events executed when `pundle.processTree(...)` or `pundle.compilation.processTree(...)` is invoked are illustrated below. One thing to keep in mind is that one dependency is only processed only once, regardless of the times it's imported in files.

<img src="https://cloud.githubusercontent.com/assets/4278113/21468982/abe6ee72-c9e6-11e6-8c41-fde31b7583ff.png" />

## Generate

The lifecycle of events executed when `pundle.generate(...)` is invoked are illustrated below. `pundle.compilation.generate(...)` has a similar life cycle except that it doesn't `processTree(...)` by itself, it **requires** all files to given to it.

<img src="https://cloud.githubusercontent.com/assets/4278113/21469076/d534c1cc-c9ec-11e6-9714-be5ff2448f22.png" />
