import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse(`{"title":"","description":"","frontmatter":{"layout":"home","hero":{"name":"RudderJS","text":"Node.js Full-Stack Framework","tagline":"Laravel's developer experience, reimagined for the Node.js ecosystem.","image":{"src":"/logo.png","alt":"RudderJS"},"actions":[{"theme":"brand","text":"Get Started","link":"/guide/installation"},{"theme":"alt","text":"Why RudderJS?","link":"/guide/"},{"theme":"alt","text":"View on GitHub","link":"https://github.com/rudderjs/rudder"}]},"features":[{"icon":"⚡","title":"Laravel-Inspired DX","details":"Familiar patterns — service providers, rudder CLI, Eloquent-style ORM, fluent middleware pipeline — without the PHP runtime."},{"icon":"🧩","title":"Modular by Design","details":"Every feature is an optional package. Use only what you need. Zero lock-in to any specific database, queue, or storage engine."},{"icon":"🌐","title":"Framework-Agnostic UI","details":"Built on Vike + Vite. Bring your own UI — React, Vue, Solid, or no frontend at all. Pure API mode is first-class."},{"icon":"🔌","title":"Pluggable Adapters","details":"Swap Prisma for Drizzle, BullMQ for Inngest, local storage for S3, SMTP for any mailer — all through a unified adapter interface."},{"icon":"🛡️","title":"TypeScript-First","details":"Strict TypeScript throughout. Every API is fully typed with generics, branded types, and discriminated unions where it counts."},{"icon":"🚀","title":"WinterCG Compatible","details":"Exports a standard Fetch handler. Deploy to Node.js, Cloudflare Workers, Deno, Bun, or any WinterCG-compatible runtime."}]},"headers":[],"relativePath":"index.md","filePath":"index.md"}`);
const _sfc_main = { name: "index.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  index as default
};
