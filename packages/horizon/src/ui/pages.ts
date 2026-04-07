import { layout } from './layout.js'

// ─── Dashboard ─────────────────────────────────────────────

export function dashboardPage(basePath: string, apiPrefix: string): string {
  return layout('Dashboard', `
    <div x-data="dashboard()" x-init="load()" x-cloak>
      <h2 class="text-xl font-bold mb-6">Dashboard</h2>

      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div class="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div class="text-2xl font-bold" x-text="stats.jobs?.total || 0"></div>
          <div class="text-sm text-gray-500">Total Jobs</div>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div class="text-2xl font-bold text-amber-600" x-text="stats.jobs?.pending || 0"></div>
          <div class="text-sm text-gray-500">Pending</div>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div class="text-2xl font-bold text-blue-600" x-text="stats.jobs?.processing || 0"></div>
          <div class="text-sm text-gray-500">Processing</div>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div class="text-2xl font-bold text-green-600" x-text="stats.jobs?.completed || 0"></div>
          <div class="text-sm text-gray-500">Completed</div>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div class="text-2xl font-bold text-red-600" x-text="stats.jobs?.failed || 0"></div>
          <div class="text-sm text-gray-500">Failed</div>
        </div>
      </div>

      <!-- Queue Metrics -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-700">Queue Metrics</h3>
          <span class="text-xs text-gray-400" x-text="stats.workers + ' worker(s)'"></span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th class="px-5 py-3 text-left">Queue</th>
                <th class="px-5 py-3 text-right">Throughput</th>
                <th class="px-5 py-3 text-right">Wait Time</th>
                <th class="px-5 py-3 text-right">Runtime</th>
                <th class="px-5 py-3 text-right">Pending</th>
                <th class="px-5 py-3 text-right">Failed</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <template x-for="q in stats.queues || []" :key="q.queue">
                <tr class="hover:bg-gray-50">
                  <td class="px-5 py-3 font-medium" x-text="q.queue"></td>
                  <td class="px-5 py-3 text-right" x-text="q.throughput + '/min'"></td>
                  <td class="px-5 py-3 text-right" x-text="q.waitTime + 'ms'"></td>
                  <td class="px-5 py-3 text-right" x-text="q.runtime + 'ms'"></td>
                  <td class="px-5 py-3 text-right text-amber-600" x-text="q.pending"></td>
                  <td class="px-5 py-3 text-right text-red-600" x-text="q.failed"></td>
                </tr>
              </template>
              <tr x-show="!stats.queues?.length">
                <td colspan="6" class="px-5 py-8 text-center text-gray-400">No queue data yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="mt-4 text-center text-xs text-gray-400">Auto-refreshes every 10 seconds</div>
    </div>
    <script>
      function dashboard() {
        return {
          stats: {},
          async load() { await this.refresh(); setInterval(() => this.refresh(), 10000) },
          async refresh() { this.stats = await fetch('${apiPrefix}/stats').then(r => r.json()) }
        }
      }
    </script>`, basePath, '/')
}

// ─── Recent Jobs ───────────────────────────────────────────

export function recentJobsPage(basePath: string, apiPrefix: string): string {
  return layout('Recent Jobs', `
    <div x-data="jobList('recent')" x-init="load()" x-cloak>
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold">Recent Jobs</h2>
        <input type="text" x-model="search" @input.debounce.300ms="load()"
               placeholder="Search..." class="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-teal-500 outline-none">
      </div>
      ${jobTable(apiPrefix)}
    </div>
    ${jobScript(apiPrefix)}`, basePath, '/jobs/recent')
}

// ─── Failed Jobs ───────────────────────────────────────────

export function failedJobsPage(basePath: string, apiPrefix: string): string {
  return layout('Failed Jobs', `
    <div x-data="jobList('failed')" x-init="load()" x-cloak>
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold">Failed Jobs</h2>
        <input type="text" x-model="search" @input.debounce.300ms="load()"
               placeholder="Search..." class="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-teal-500 outline-none">
      </div>
      ${jobTable(apiPrefix)}
    </div>
    ${jobScript(apiPrefix)}`, basePath, '/jobs/failed')
}

function jobTable(apiPrefix: string): string {
  return `
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500">
            <tr>
              <th class="px-4 py-3 text-left">Name</th>
              <th class="px-4 py-3 text-left">Queue</th>
              <th class="px-4 py-3 text-left">Status</th>
              <th class="px-4 py-3 text-right">Duration</th>
              <th class="px-4 py-3 text-right">Time</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <template x-for="job in jobs" :key="job.id">
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 font-mono text-xs" x-text="job.name"></td>
                <td class="px-4 py-3" x-text="job.queue"></td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        :class="{pending:'bg-amber-100 text-amber-700',processing:'bg-blue-100 text-blue-700',completed:'bg-green-100 text-green-700',failed:'bg-red-100 text-red-700'}[job.status]"
                        x-text="job.status"></span>
                </td>
                <td class="px-4 py-3 text-right" x-text="job.duration ? job.duration + 'ms' : '—'"></td>
                <td class="px-4 py-3 text-right text-gray-400 text-xs" x-text="ago(job.dispatchedAt)"></td>
                <td class="px-4 py-3 text-right">
                  <button x-show="job.status === 'failed'" @click="retry(job.id)"
                          class="text-xs text-teal-600 hover:text-teal-800 mr-2">Retry</button>
                  <button @click="remove(job.id)"
                          class="text-xs text-red-500 hover:text-red-700">Delete</button>
                </td>
              </tr>
            </template>
            <tr x-show="jobs.length === 0">
              <td colspan="6" class="px-4 py-12 text-center text-gray-400">No jobs found.</td>
            </tr>
          </tbody>
        </table>
        <div class="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm">
          <span class="text-gray-500">Total: <span x-text="meta.total"></span></span>
          <div class="flex gap-1">
            <button @click="page > 1 && (page--, load())" :disabled="page <= 1" class="px-3 py-1 border rounded text-xs disabled:opacity-30">Prev</button>
            <button @click="page++; load()" class="px-3 py-1 border rounded text-xs">Next</button>
          </div>
        </div>
      </div>`
}

function jobScript(apiPrefix: string): string {
  return `
    <script>
      function jobList(type) {
        return {
          jobs: [], meta: { total: 0 }, page: 1, search: '',
          async load() {
            const params = new URLSearchParams({ page: this.page, per_page: 50 })
            if (this.search) params.set('search', this.search)
            const data = await fetch('${apiPrefix}/jobs/' + type + '?' + params).then(r => r.json())
            this.jobs = data.data || []
            this.meta = data.meta || { total: 0 }
          },
          async retry(id) {
            await fetch('${apiPrefix}/jobs/' + id + '/retry', { method: 'POST' })
            this.load()
          },
          async remove(id) {
            await fetch('${apiPrefix}/jobs/' + id, { method: 'DELETE' })
            this.load()
          },
          ago(dateStr) {
            const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
            if (s < 60) return s + 's ago'
            if (s < 3600) return Math.floor(s / 60) + 'm ago'
            if (s < 86400) return Math.floor(s / 3600) + 'h ago'
            return Math.floor(s / 86400) + 'd ago'
          }
        }
      }
    </script>`
}

// ─── Queues ────────────────────────────────────────────────

export function queuesPage(basePath: string, apiPrefix: string): string {
  return layout('Queues', `
    <div x-data="queues()" x-init="load()" x-cloak>
      <h2 class="text-xl font-bold mb-6">Queues</h2>
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500">
            <tr>
              <th class="px-5 py-3 text-left">Queue</th>
              <th class="px-5 py-3 text-right">Throughput/min</th>
              <th class="px-5 py-3 text-right">Avg Wait</th>
              <th class="px-5 py-3 text-right">Avg Runtime</th>
              <th class="px-5 py-3 text-right">Pending</th>
              <th class="px-5 py-3 text-right">Active</th>
              <th class="px-5 py-3 text-right">Completed</th>
              <th class="px-5 py-3 text-right">Failed</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <template x-for="q in data" :key="q.queue">
              <tr class="hover:bg-gray-50">
                <td class="px-5 py-3 font-medium" x-text="q.queue"></td>
                <td class="px-5 py-3 text-right" x-text="q.throughput"></td>
                <td class="px-5 py-3 text-right" x-text="q.waitTime + 'ms'"></td>
                <td class="px-5 py-3 text-right" x-text="q.runtime + 'ms'"></td>
                <td class="px-5 py-3 text-right text-amber-600" x-text="q.pending"></td>
                <td class="px-5 py-3 text-right text-blue-600" x-text="q.active"></td>
                <td class="px-5 py-3 text-right text-green-600" x-text="q.completed"></td>
                <td class="px-5 py-3 text-right text-red-600" x-text="q.failed"></td>
              </tr>
            </template>
            <tr x-show="data.length === 0">
              <td colspan="8" class="px-5 py-12 text-center text-gray-400">No queue data yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <script>
      function queues() {
        return {
          data: [],
          async load() {
            const res = await fetch('${apiPrefix}/queues').then(r => r.json())
            this.data = res.data || []
          }
        }
      }
    </script>`, basePath, '/queues')
}

// ─── Workers ───────────────────────────────────────────────

export function workersPage(basePath: string, apiPrefix: string): string {
  return layout('Workers', `
    <div x-data="workers()" x-init="load()" x-cloak>
      <h2 class="text-xl font-bold mb-6">Workers</h2>
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500">
            <tr>
              <th class="px-5 py-3 text-left">ID</th>
              <th class="px-5 py-3 text-left">Queue</th>
              <th class="px-5 py-3 text-left">Status</th>
              <th class="px-5 py-3 text-right">Jobs Run</th>
              <th class="px-5 py-3 text-right">Memory</th>
              <th class="px-5 py-3 text-right">Last Job</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <template x-for="w in data" :key="w.id">
              <tr class="hover:bg-gray-50">
                <td class="px-5 py-3 font-mono text-xs" x-text="w.id"></td>
                <td class="px-5 py-3" x-text="w.queue"></td>
                <td class="px-5 py-3">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        :class="{active:'bg-green-100 text-green-700',idle:'bg-gray-100 text-gray-600',paused:'bg-amber-100 text-amber-700'}[w.status]"
                        x-text="w.status"></span>
                </td>
                <td class="px-5 py-3 text-right" x-text="w.jobsRun"></td>
                <td class="px-5 py-3 text-right" x-text="w.memoryMb + ' MB'"></td>
                <td class="px-5 py-3 text-right text-gray-400 text-xs" x-text="w.lastJobAt ? ago(w.lastJobAt) : '—'"></td>
              </tr>
            </template>
            <tr x-show="data.length === 0">
              <td colspan="6" class="px-5 py-12 text-center text-gray-400">No workers registered.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <script>
      function workers() {
        return {
          data: [],
          async load() {
            const res = await fetch('${apiPrefix}/workers').then(r => r.json())
            this.data = res.data || []
          },
          ago(dateStr) {
            const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
            if (s < 60) return s + 's ago'
            if (s < 3600) return Math.floor(s / 60) + 'm ago'
            return Math.floor(s / 3600) + 'h ago'
          }
        }
      }
    </script>`, basePath, '/workers')
}
