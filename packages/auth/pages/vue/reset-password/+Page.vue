<script setup lang="ts">
import '@/index.css'
import { ref, computed } from 'vue'

const password        = ref('')
const confirmPassword = ref('')
const error           = ref('')
const success         = ref('')
const loading         = ref(false)

const params = new URLSearchParams(window.location.search)
const token  = params.get('token')

const hasToken = computed(() => !!token)

async function handleSubmit() {
  error.value   = ''
  success.value = ''

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.'
    return
  }

  loading.value = true
  try {
    const res = await fetch('/api/auth/reset-password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token, newPassword: password.value }),
    })
    if (res.ok) {
      success.value = 'Your password has been reset successfully.'
    } else {
      const body = await res.json().catch(() => ({})) as { message?: string }
      error.value = body.message ?? 'Invalid or expired token.'
    }
  } catch {
    error.value = 'Something went wrong. Please try again.'
  }
  loading.value = false
}
</script>

<template>
  <div class="flex min-h-svh items-center justify-center p-4">
    <div class="w-full max-w-sm space-y-6">
      <template v-if="!hasToken">
        <div class="space-y-4 rounded-lg border p-6 shadow-sm">
          <p class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">Missing reset token.</p>
          <p class="text-center text-sm text-gray-500">
            <a href="/forgot-password" class="underline hover:text-black">Request a new reset link</a>
          </p>
        </div>
      </template>
      <template v-else>
        <div class="text-center">
          <h1 class="text-2xl font-bold">Reset password</h1>
          <p class="text-sm text-gray-500 mt-1">Enter your new password</p>
        </div>
        <form @submit.prevent="handleSubmit" class="space-y-4 rounded-lg border p-6 shadow-sm">
          <p v-if="error" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>
          <template v-if="success">
            <div class="space-y-2">
              <p class="rounded-md bg-green-50 px-3 py-2 text-sm text-green-600">{{ success }}</p>
              <p class="text-center text-sm text-gray-500">
                <a href="/login" class="underline hover:text-black">Sign in</a>
              </p>
            </div>
          </template>
          <template v-else>
            <div>
              <label class="block text-sm font-medium mb-1" for="password">New password</label>
              <input id="password" v-model="password" type="password" placeholder="••••••••"
                required minlength="8" autocomplete="new-password"
                class="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1" for="confirm-password">Confirm password</label>
              <input id="confirm-password" v-model="confirmPassword" type="password" placeholder="••••••••"
                required minlength="8" autocomplete="new-password"
                class="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black" />
            </div>
            <button type="submit" :disabled="loading"
              class="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-50">
              {{ loading ? 'Resetting...' : 'Reset password' }}
            </button>
          </template>
        </form>
      </template>
    </div>
  </div>
</template>
