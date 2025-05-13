## Debuge-React

The current version is 18 (18.1).

In the source code file, annotations are made for the rendering process, scheduling, event instruction scheduling, etc.

It should be noted that the latest version 19 has made a large number of reconstructions to the logic.

### Tips

1. In 'src/react', it is our source code file.

2. You can run this debug project by running `pnpm start`.

3. Due to historical issues, react uses flow as a type constraint. You may need to eliminate the warnings by installing 'Flow Language Support' and running `pnpm postinstall` in the react source code directory to generate the configuration file of flow.
