import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Integrations","description":"","frontmatter":{},"headers":[],"relativePath":"integrations/index.md","filePath":"integrations/index.md"}');
const _sfc_main = { name: "integrations/index.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="integrations" tabindex="-1">Integrations <a class="header-anchor" href="#integrations" aria-label="Permalink to &quot;Integrations&quot;">​</a></h1><p>Step-by-step guides for connecting RudderJS to common infrastructure.</p><h2 id="guides" tabindex="-1">Guides <a class="header-anchor" href="#guides" aria-label="Permalink to &quot;Guides&quot;">​</a></h2><h3 id="authentication" tabindex="-1"><a href="/integrations/auth.html">Authentication</a> <a class="header-anchor" href="#authentication" aria-label="Permalink to &quot;[Authentication](/integrations/auth)&quot;">​</a></h3><p>Full walkthrough of email/password and OAuth authentication using <code>@rudderjs/auth</code> and <a href="https://better-auth.com" target="_blank" rel="noreferrer">better-auth</a>. Covers database schema, provider registration, session middleware, and social providers.</p><h3 id="notifications" tabindex="-1"><a href="/integrations/notifications.html">Notifications</a> <a class="header-anchor" href="#notifications" aria-label="Permalink to &quot;[Notifications](/integrations/notifications)&quot;">​</a></h3><p>Send multi-channel notifications (mail + database) using <code>@rudderjs/notification</code>. Covers defining notification classes, the <code>Notifiable</code> interface, the <code>notify()</code> helper, and adding custom channels.</p><h3 id="deployment" tabindex="-1"><a href="/integrations/deployment.html">Deployment</a> <a class="header-anchor" href="#deployment" aria-label="Permalink to &quot;[Deployment](/integrations/deployment)&quot;">​</a></h3><p>Deploy RudderJS apps to Node.js, Docker, Railway, Render, Fly.io, and Cloudflare Workers. Covers production builds, database migrations, environment variables, and PM2 process management.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("integrations/index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  index as default
};
