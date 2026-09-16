// Plain (non-module) stylesheet side-effect imports. Next declares *.module.css
// but not bare *.css, and `moduleResolution: bundler` rejects undeclared
// extensions.
declare module "*.css";
