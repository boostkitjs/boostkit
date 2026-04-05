import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Contributing to RudderJS","description":"","frontmatter":{},"headers":[],"relativePath":"contributing/index.md","filePath":"contributing/index.md"}');
const _sfc_main = { name: "contributing/index.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="contributing-to-rudderjs" tabindex="-1">Contributing to RudderJS <a class="header-anchor" href="#contributing-to-rudderjs" aria-label="Permalink to &quot;Contributing to RudderJS&quot;">​</a></h1><p>Guides for working on the RudderJS monorepo — adding packages, extending the panels framework, and following project conventions.</p><h2 id="in-this-section" tabindex="-1">In this section <a class="header-anchor" href="#in-this-section" aria-label="Permalink to &quot;In this section&quot;">​</a></h2><table tabindex="0"><thead><tr><th>Guide</th><th>Description</th></tr></thead><tbody><tr><td><a href="./new-package.html">Creating a New Package</a></td><td>Scaffold, conventions, testing, and publishing a new <code>@rudderjs/*</code> package</td></tr><tr><td><a href="./panels-extension.html">Creating a Panels Extension</a></td><td>Build a package that extends <code>@rudderjs/panels</code> with new field types or editor integrations</td></tr></tbody></table><h2 id="quick-orientation" tabindex="-1">Quick orientation <a class="header-anchor" href="#quick-orientation" aria-label="Permalink to &quot;Quick orientation&quot;">​</a></h2><ul><li><strong>Monorepo root</strong>: <code>pnpm build</code> — builds all packages via Turbo</li><li><strong>Single package</strong>: <code>cd packages/&lt;name&gt; &amp;&amp; pnpm build / pnpm test</code></li><li><strong>Playground</strong> (demo app): <code>cd playground &amp;&amp; pnpm dev</code></li><li><strong>Docs</strong> (this site): <code>cd docs &amp;&amp; pnpm dev</code></li></ul><p>See <a href="https://github.com/rudderjs/rudder/blob/main/CLAUDE.md" target="_blank" rel="noreferrer"><code>CLAUDE.md</code></a> in the repo root for the full development reference including common pitfalls and architecture decisions.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("contributing/index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  index as default
};
