<script>
  import { onMount } from 'svelte';
  import Dashboard from './components/Dashboard.svelte';
  import FormBuilder from './components/FormBuilder.svelte';
  import Kiosk from './components/Kiosk.svelte';
  import Answers from './components/Answers.svelte';

  const API_BASE = 'http://10.136.33.14:5000/api'; 

  let activeTab = 'surveys'; 
  let surveysList = [];
  let responses = [];
  let activeSurveyId = "";
  let isOfflineMode = false;
  let isDedicatedKioskMode = false;
  
  // Responsive sidebar toggles
  let isSidebarVisible = true;

  onMount(async () => {
    await refreshDataLedger();

    const urlParams = new URLSearchParams(window.location.hash.includes('?') 
      ? window.location.hash.split('?')[1] 
      : window.location.search
    );
    const targetSurveyId = urlParams.get('id');

    if (targetSurveyId || window.location.hash.startsWith('#/kiosk')) {
      isDedicatedKioskMode = true;
      isSidebarVisible = false; // Never show administrative shells on kiosk hardware endpoints
      activeTab = 'kiosk';
      if (targetSurveyId) {
        activeSurveyId = targetSurveyId;
      }
    } else if (surveysList.length > 0) {
      activeSurveyId = surveysList[0]._id;
    }
  });

  async function refreshDataLedger() {
    try {
      const surveyRes = await fetch(`${API_BASE}/surveys`);
      const surveyData = await surveyRes.json();
      if (surveyData.success) {
        surveysList = surveyData.surveys;
        isOfflineMode = false;
      }

      const responseRes = await fetch(`${API_BASE}/responses`);
      const responseData = await responseRes.json();
      if (responseData.success) responses = responseData.responses;
    } catch (err) {
      console.warn("Backend link offline fallback active.");
      isOfflineMode = true;
    }
  }

  $: activeSurvey = surveysList.find(s => s._id === activeSurveyId) || { title: "None Selected", questions: [] };

  async function handleCreateNewSurvey() {
    try {
      const res = await fetch(`${API_BASE}/surveys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: "New Custom Form Schema", questions: [] })
      });
      const data = await res.json();
      if (data.success) {
        surveysList = [...surveysList, data.survey];
        activeSurveyId = data.survey._id;
        activeTab = 'builder';
        return;
      }
    } catch (err) {}
    const localId = `LOCAL-${Math.floor(1000 + Math.random() * 9000)}`;
    surveysList = [...surveysList, { _id: localId, title: "New Custom Form Schema (Offline)", questions: [] }];
    activeSurveyId = localId;
    activeTab = 'builder';
  }

  async function persistActiveSurveyState() {
    if (!activeSurveyId || String(activeSurveyId).startsWith('LOCAL-')) return;
    try {
      await fetch(`${API_BASE}/surveys/${activeSurveyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: activeSurvey.title, questions: activeSurvey.questions })
      });
    } catch (err) {}
  }

  function addQuestion(text, type, options = []) {
    activeSurvey.questions = [...activeSurvey.questions, { type, questionText: text, isRequired: false, options }];
    surveysList = surveysList;
    persistActiveSurveyState();
  }

  function removeQuestion(index) {
    activeSurvey.questions = activeSurvey.questions.filter((_, i) => i !== index);
    surveysList = surveysList;
    persistActiveSurveyState();
  }

  async function handleDeleteSurvey(id) {
    try {
      if (!String(id).startsWith('LOCAL-')) {
        await fetch(`${API_BASE}/surveys/${id}`, { method: 'DELETE' });
      }
      surveysList = surveysList.filter(s => s._id !== id);
    } catch (err) {
      surveysList = surveysList.filter(s => s._id !== id);
    }
  }

  async function registerResponse(formattedAnswers) {
    try {
      await fetch(`${API_BASE}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surveyTitle: activeSurvey.title, answers: formattedAnswers })
      });
    } catch (err) {}
  }

  function handleSelectAndEdit(id) { activeSurveyId = id; activeTab = 'builder'; }
  function handleSelectAndTest(id) { activeSurveyId = id; activeTab = 'kiosk'; }
</script>

<div class="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden m-0 p-0 box-border">
  
  <!-- LEFT SIDEBAR PANEL (Collapsible with smooth transition) -->
  {#if isSidebarVisible}
    <aside class="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 h-full">
      <div>
        <div class="p-5 h-16 border-b border-slate-800 flex items-center space-x-3 box-border">
          <div class="h-8 w-8 rounded-lg bg-cyan-600 flex items-center justify-center font-bold text-white shadow-md">S</div>
          <span class="font-bold text-base tracking-tight text-white">Sdx DigitalSurvey</span>
        </div>
        
        <nav class="p-4 space-y-1">
          <button class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all {activeTab === 'surveys' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/10' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}" on:click={() => { activeTab = 'surveys'; refreshDataLedger(); }}>
            <span>📋</span> <span>Surveys Portal</span>
          </button>
          <button class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all {activeTab === 'builder' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/10' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}" on:click={() => activeTab = 'builder'} disabled={surveysList.length === 0}>
            <span>🛠️</span> <span class={surveysList.length === 0 ? 'opacity-40' : ''}>Form Designer</span>
          </button>
          <button class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all {activeTab === 'kiosk' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/10' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}" on:click={() => activeTab = 'kiosk'} disabled={surveysList.length === 0 || !activeSurvey.questions || activeSurvey.questions.length === 0}>
            <span>📱</span> <span class={(surveysList.length === 0 || !activeSurvey.questions || activeSurvey.questions.length === 0) ? 'opacity-40' : ''}>Live Kiosk Mode</span>
          </button>
          <button class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all {activeTab === 'answers' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/10' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}" on:click={() => { activeTab = 'answers'; refreshDataLedger(); }}>
            <span>📥</span> <span>Answers Log</span>
          </button>
        </nav>
      </div>
      
      <div class="p-4 border-t border-slate-800 bg-slate-900/50 text-[11px] text-slate-500 font-medium tracking-wide">
        Target: <span class="text-slate-300 font-semibold">{activeSurvey?.title || 'None'}</span>
      </div>
    </aside>
  {/if}

  <!-- MAIN VIEWPORT CONTAINER WITH RESPONSIVE TOP HEADER WRAPPER -->
  <div class="flex-1 flex flex-col h-full overflow-hidden">
    
    <!-- STANDARD TOP NAVBAR HEADER (Always visible unless in standalone dedicated kiosk route) -->
    {#if !isDedicatedKioskMode}
      <header class="w-full h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 box-border shrink-0">
        <div class="flex items-center space-x-4">
          <!-- HAMBURGER TOGGLE MENU ACTION BUTTON -->
          <button 
            on:click={() => isSidebarVisible = !isSidebarVisible}
            class="p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700/60 transition-all flex items-center justify-center focus:outline-none select-none active:scale-95"
            title={isSidebarVisible ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            <span class="text-xl leading-none font-bold">☰</span>
          </button>
          
          {#if !isSidebarVisible}
            <!-- Mini Logo fallback brand mark when sidebar collapses -->
            <div class="flex items-center space-x-2 animate-fade">
              <div class="h-6 w-6 rounded-md bg-cyan-600 flex items-center justify-center font-bold text-xs text-white">S</div>
              <span class="font-bold text-sm tracking-tight text-white">Sdx DigitalSurvey</span>
            </div>
          {/if}
        </div>

        <div class="flex items-center space-x-3 text-xs text-slate-400 font-mono">
          <span class="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
          <span class="hidden sm:inline">Operational Node Connection Online</span>
        </div>
      </header>
    {/if}

    <!-- CONTENT BODY VIEWPORT WINDOW -->
    <main class="flex-1 bg-slate-950 overflow-y-auto w-full box-border {isDedicatedKioskMode ? 'p-0' : 'p-6 md:p-8 lg:p-10'}">
      
      <!-- FIXED LAYOUT STAGE WITH MAX-WIDTH BOUNDS CONTROLLING ALIGNMENT DISTORTION -->
      <div class="w-full h-full {isDedicatedKioskMode || activeTab === 'kiosk' ? '' : 'max-w-7xl mx-auto'}">
        {#if activeTab === 'surveys'}
          <div class="w-full h-full">
            <Dashboard 
              surveys={surveysList} 
              responseCount={responses.length} 
              onCreateSurvey={handleCreateNewSurvey}
              onDeleteSurvey={handleDeleteSurvey}
              onEditSurvey={handleSelectAndEdit}
              onTestSurvey={handleSelectAndTest}
            />
          </div>
        {:else if activeTab === 'builder'}
          <div class="w-full h-full" on:focusout={persistActiveSurveyState}>
            <FormBuilder 
              bind:surveyTitle={activeSurvey.title} 
              bind:questions={activeSurvey.questions}
              onAddQuestion={addQuestion} 
              onRemoveQuestion={removeQuestion} 
            />
          </div>
        {:else if activeTab === 'kiosk'}
          <div class="w-full h-full flex items-center justify-center">
            <Kiosk 
              surveyTitle={activeSurvey.title} 
              questions={activeSurvey.questions} 
              onSubmitResponse={registerResponse} 
            />
          </div>
        {:else if activeTab === 'answers'}
          <div class="w-full h-full">
            <Answers {responses} surveys={surveysList} />
          </div>
        {/if}
      </div>

    </main>
  </div>
</div>