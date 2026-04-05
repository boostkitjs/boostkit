import { ssrRenderAttrs, ssrRenderStyle } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"@rudderjs/dashboards","description":"","frontmatter":{},"headers":[],"relativePath":"packages/dashboards.md","filePath":"packages/dashboards.md"}');
const _sfc_main = { name: "packages/dashboards.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="rudderjs-dashboards" tabindex="-1">@rudderjs/dashboards <a class="header-anchor" href="#rudderjs-dashboards" aria-label="Permalink to &quot;@rudderjs/dashboards&quot;">​</a></h1><blockquote><p><strong>Merged into <code>@rudderjs/panels</code></strong> — Dashboard functionality (Widget, Dashboard, DashboardGrid, per-user layout persistence) is now part of the panels package.</p></blockquote><div class="language-ts vp-adaptive-theme line-numbers-mode"><button title="Copy Code" class="copy"></button><span class="lang">ts</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#6A737D", "--shiki-dark": "#6A737D" })}">// All imports from @rudderjs/panels</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#D73A49", "--shiki-dark": "#F97583" })}">import</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}"> { Panel, Widget, Dashboard, Stats, Chart, Table, List, Tabs } </span><span style="${ssrRenderStyle({ "--shiki-light": "#D73A49", "--shiki-dark": "#F97583" })}">from</span><span style="${ssrRenderStyle({ "--shiki-light": "#032F62", "--shiki-dark": "#9ECBFF" })}"> &#39;@rudderjs/panels&#39;</span></span></code></pre><div class="line-numbers-wrapper" aria-hidden="true"><span class="line-number">1</span><br><span class="line-number">2</span><br></div></div><p>See the <a href="/packages/panels/schema.html">Panels Widgets documentation</a> for the full API reference.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("packages/dashboards.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const dashboards = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  dashboards as default
};
