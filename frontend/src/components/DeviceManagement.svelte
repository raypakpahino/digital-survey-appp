<script>
  import { onMount } from 'svelte';

  export let currentUser = null;

  let devices = [];
  let availableSurveys = [];
  let isLoading = false;

  // NEW DEVICE ENTRY FORM STATE
  let inputDeviceName = "";
  let inputPin = "1234";
  let selectedFormTitle = "";
  let formMessage = "";
  let formMessageType = "info"; // "success" | "error"

  const API_BASE = "/api";

  async function loadData() {
    isLoading = true;
    try {
      const devRes = await fetch(`${API_BASE}/devices`);
      const devData = await devRes.json();
      if (devData.success) devices = devData.devices || [];

      const surRes = await fetch(`${API_BASE}/surveys`);
      const surData = await surRes.json();
      if (surData.success) {
        availableSurveys = (surData.surveys || []).filter(s => !s.isDraft && !String(s._id).startsWith("DRAFT-"));
        if (!selectedFormTitle && availableSurveys.length > 0) {
          selectedFormTitle = availableSurveys[0].title;
        }
      }
    } catch (err) {
      console.warn("Error loading device management data:", err);
    }
    isLoading = false;
  }

  async function handleAddDevice() {
    formMessage = "";
    if (!inputDeviceName.trim()) {
      formMessage = "Device Name is required.";
      formMessageType = "error";
      return;
    }

    if (!inputPin.trim() || inputPin.length < 4) {
      formMessage = "PIN must be at least 4 digits.";
      formMessageType = "error";
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/devices/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceName: inputDeviceName.trim(),
          accessPin: inputPin.trim(),
          allowedFormTitle: selectedFormTitle || "All Forms",
          loggedInUser: currentUser?.username || "Admin"
        })
      });

      const data = await res.json();
      if (data.success) {
        formMessage = `Device '${inputDeviceName.trim()}' registered successfully.`;
        formMessageType = "success";
        inputDeviceName = "";
        inputPin = "1234";
        loadData();
      } else {
        formMessage = data.message || "Failed to register device.";
        formMessageType = "error";
      }
    } catch (err) {
      formMessage = "Error connecting to server.";
      formMessageType = "error";
    }
  }

  async function handleDeleteDevice(id) {
    if (!confirm("Remove this registered device?")) return;
    try {
      await fetch(`${API_BASE}/devices/${id}`, { method: "DELETE" });
      devices = devices.filter(d => d._id !== id);
    } catch (err) {
      console.error(err);
    }
  }

  onMount(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  });
</script>

<div class="w-full space-y-8 animate-fade pb-12 box-border">
  <!-- TOP HEADER -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
    <div>
      <h1 class="text-2xl font-black tracking-tight text-[#1a2b6c] dark:text-white">Device & Access Management</h1>
      <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Configure registered client devices, assign access PINs, and set authorized form permissions.</p>
    </div>
    
    <button 
      on:click={loadData} 
      class="bg-[#1a2b6c] hover:bg-[#e31b23] active:bg-[#c2151c] text-white px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 flex items-center space-x-2 shrink-0 border border-transparent cursor-pointer"
      style="color: #ffffff !important; background-color: #1a2b6c !important;"
    >
      <svg class="w-4 h-4 fill-current shrink-0 {isLoading ? 'animate-spin' : ''}" viewBox="0 0 24 24" style="fill: #ffffff !important;">
        <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
      </svg>
      <span style="color: #ffffff !important; font-weight: 800 !important;">Refresh Devices</span>
    </button>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
    
    <!-- LEFT PANEL: REGISTER / ASSIGN NEW DEVICE CARD -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5 h-fit">
      <div class="space-y-1">
        <span class="text-[10px] font-mono font-extrabold text-[#e31b23] dark:text-rose-400 uppercase tracking-widest block">Device Registration</span>
        <h3 class="text-base font-black text-[#1a2b6c] dark:text-white">Add / Update Device</h3>
      </div>
      
      {#if formMessage}
        <div class="text-xs font-bold p-3 rounded-xl border flex items-center space-x-2 {formMessageType === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'}">
          <span>{formMessage}</span>
        </div>
      {/if}

      <form on:submit|preventDefault={handleAddDevice} class="space-y-4">
        <!-- 1. DEVICE NAME INPUT -->
        <div class="space-y-1">
          <label for="dev-name-input" class="text-[10px] font-mono font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">1. Device Name</label>
          <input 
            id="dev-name-input"
            type="text" 
            bind:value={inputDeviceName} 
            placeholder="e.g. Charisse's Phone or Tablet-A" 
            class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-[#1a2b6c] dark:text-white placeholder-slate-400 dark:placeholder-slate-600 rounded-xl p-3 font-mono font-bold focus:outline-none focus:border-[#e31b23] focus:ring-2 focus:ring-[#e31b23]/20 transition-all" 
          />
        </div>

        <!-- 2. ACCESS PIN INPUT -->
        <div class="space-y-1">
          <label for="dev-pin-input" class="text-[10px] font-mono font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">2. Form Access PIN</label>
          <input 
            id="dev-pin-input"
            type="text" 
            maxlength="6"
            bind:value={inputPin} 
            placeholder="e.g. 1234" 
            class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-[#1a2b6c] dark:text-white font-mono font-bold rounded-xl p-3 focus:outline-none focus:border-[#e31b23] focus:ring-2 focus:ring-[#e31b23]/20 transition-all" 
          />
        </div>

        <!-- 3. FORMS TO ACCESS SELECTOR -->
        <div class="space-y-1">
          <label for="dev-form-select" class="text-[10px] font-mono font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">3. Authorized Form Access</label>
          <select 
            id="dev-form-select"
            bind:value={selectedFormTitle} 
            class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-[#1a2b6c] dark:text-white rounded-xl p-3 font-bold focus:outline-none focus:border-[#e31b23] focus:ring-2 focus:ring-[#e31b23]/20 transition-all cursor-pointer"
          >
            <option value="All Forms">All Available Forms</option>
            {#each availableSurveys as s}
              <option value={s.title}>{s.title}</option>
            {/each}
          </select>
        </div>

        <button 
          type="submit" 
          class="w-full bg-[#1a2b6c] hover:bg-[#e31b23] active:bg-[#c2151c] text-white font-extrabold py-3.5 px-4 rounded-xl text-xs transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 border border-transparent cursor-pointer flex items-center justify-center space-x-2" 
          style="color: #ffffff !important; background-color: #1a2b6c !important;"
        >
          <svg class="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24" style="fill: #ffffff !important;">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          <span style="color: #ffffff !important; font-weight: 800 !important;">Save Device Access Rule</span>
        </button>
      </form>
    </div>

    <!-- RIGHT PANEL: HIGH CONTRAST DEVICE TABLE -->
    <div class="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
      <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <h3 class="text-xs font-mono font-extrabold text-[#1a2b6c] dark:text-cyan-400 uppercase tracking-wider">Registered Device Roster</h3>
        <span class="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">{devices.length} Total Registered</span>
      </div>

      {#if devices.length === 0}
        <div class="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 dark:text-slate-500 text-xs">
          No registered devices found. Use the left panel to add device permissions.
        </div>
      {:else}
        <div class="overflow-x-auto custom-scrollbar">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                <th class="py-3 px-3">Device Name</th>
                <th class="py-3 px-3">Access PIN</th>
                <th class="py-3 px-3">Authorized Forms</th>
                <th class="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs font-mono">
              {#each devices as dev (dev._id || dev.deviceName)}
                <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <!-- 1. DEVICE NAME (FORCED INLINE HIGH-CONTRAST DARK COLOR IN LIGHT MODE) -->
                  <td class="py-3.5 px-3 font-bold">
                    <div class="flex items-center space-x-2">
                      <span class="h-2 w-2 rounded-full bg-emerald-500 shrink-0"></span>
                      <span class="truncate max-w-[180px] font-black text-slate-900 dark:text-white" style="color: var(--dev-name-color, #0f172a);">
                        {dev.deviceName}
                      </span>
                    </div>
                  </td>

                  <!-- 2. ACCESS PIN BADGE -->
                  <td class="py-3.5 px-3">
                    <span class="bg-rose-50 dark:bg-rose-950/60 text-[#e31b23] dark:text-rose-400 px-3 py-1 rounded-md font-mono font-black tracking-widest border border-rose-200 dark:border-rose-900/60">
                      {dev.accessPin || dev.pinCode || '1234'}
                    </span>
                  </td>

                  <!-- 3. AUTHORIZED FORMS BADGE -->
                  <td class="py-3.5 px-3 font-bold">
                    <span class="px-3 py-1 rounded-md border text-[11px] font-black {dev.allowedFormTitle === 'All Forms' || !dev.allowedFormTitle ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-800/60 text-[#1a2b6c] dark:text-cyan-300' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'}">
                      {dev.allowedFormTitle || 'All Forms'}
                    </span>
                  </td>

                  <!-- DELETE BUTTON -->
                  <td class="py-3.5 px-3 text-right">
                    <button 
                      on:click={() => handleDeleteDevice(dev._id)}
                      class="text-xs bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white px-3.5 py-1.5 rounded-xl font-extrabold transition-all duration-150 shadow-xs hover:shadow-md active:scale-95 cursor-pointer border border-transparent"
                      style="color: #ffffff !important; background-color: #e11d48 !important;"
                    >
                      <span style="color: #ffffff !important; font-weight: 800 !important;">Delete</span>
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>

  </div>
</div>

<style>
  :global(.dark) {
    --dev-name-color: #ffffff;
  }
  .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
</style>