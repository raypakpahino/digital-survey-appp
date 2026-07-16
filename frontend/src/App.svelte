<script>
  import { onMount } from 'svelte';
  import Dashboard from './components/Dashboard.svelte';
  import FormBuilder from './components/FormBuilder.svelte';
  import Kiosk from './components/Kiosk.svelte';
  import Answers from './components/Answers.svelte';

  const API_BASE = 'http://localhost:5000/api';

  let activeTab = 'surveys'; 
  let surveysList = [];
  let responses = [];
  let activeSurveyId = "";
  let isOfflineMode = false;

  onMount(async () => {
    await refreshDataLedger();
    if (surveysList.length > 0) {
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
      console.warn("Backend server not reached. Operating in Local Memory Fallback Mode.");
      isOfflineMode = true;
    }
  }

  $: activeSurvey = surveysList.find(s => s._id === activeSurveyId) || { title: "None Selected", questions: [] };

  // CREATE: Tries backend, instantly falls back to local memory if server is down
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
        isOfflineMode = false;
        return;
      }
    } catch (err) {
      console.warn("Creating survey in offline fallback mode.");
    }

    // LOCAL OFFLINE FALLBACK ENGINE:
    isOfflineMode = true;
    const localId = `LOCAL-${Math.floor(1000 + Math.random() * 9000)}`;
    const localSurvey = {
      _id: localId,
      title: "New Custom Form Schema (Offline)",
      questions: []
    };
    surveysList = [...surveysList, localSurvey];
    activeSurveyId = localId;
    activeTab = 'builder';
  }

  // UPDATE: Auto-syncs to database, or keeps in local state if offline
  async function persistActiveSurveyState() {
    if (!activeSurveyId || String(activeSurveyId).startsWith('LOCAL-')) return;
    try {
      await fetch(`${API_BASE}/surveys/${activeSurveyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: activeSurvey.title, questions: activeSurvey.questions })
      });
    } catch (err) {
      console.warn("Offline: failed to sync edits to cloud database.");
    }
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

  // DELETE: Safely drops records online or locally
  async function handleDeleteSurvey(id) {
    if (String(id).startsWith('LOCAL-')) {
      surveysList = surveysList.filter(s => s._id !== id);
      if (activeSurveyId === id && surveysList.length > 0) {
        activeSurveyId = surveysList[0]._id;
      } else if (surveysList.length === 0) {
        activeSurveyId = "";
      }
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/surveys/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        surveysList = surveysList.filter(s => s._id !== id);
        if (activeSurveyId === id && surveysList.length > 0) {
          activeSurveyId = surveysList[0]._id;
        } else if (surveysList.length === 0) {
          activeSurveyId = "";
        }
      }
    } catch (err) {
      console.warn("Offline: removing from local memory grid.");
      surveysList = surveysList.filter(s => s._id !== id);
      if (activeSurveyId === id && surveysList.length > 0) {
        activeSurveyId = surveysList[0]._id;
      } else if (surveysList.length === 0) {
        activeSurveyId = "";
      }
    }
  }

  // RESPONSE: Log response online, fallback to in-memory response mapping on network timeout
  async function registerResponse(formattedAnswers) {
    const isLocalSurvey = String(activeSurveyId).startsWith('LOCAL-');
    if (isLocalSurvey) {
      const localResponse = {
        _id: `RESP-${Math.floor(1000 + Math.random() * 9000)}`,
        surveyTitle: activeSurvey.title,
        timestamp: new Date().toLocaleTimeString(),
        answers: formattedAnswers
      };
      responses = [localResponse, ...responses];
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surveyTitle: activeSurvey.title, answers: formattedAnswers })
      });
      const data = await res.json();
      if (data.success) {
        responses = [data.response, ...responses];
      }
    } catch (err) {
      console.warn("Offline: logging response temporarily in local storage.");
      const localResponse = {
        _id: `RESP-${Math.floor(1000 + Math.random() * 9000)}`,
        surveyTitle: activeSurvey.title,
        timestamp: new Date().toLocaleTimeString(),
        answers: formattedAnswers
      };
      responses = [localResponse, ...responses];
    }
  }

  function handleSelectAndEdit(id) {
    activeSurveyId = id;
    activeTab = 'builder';
  }

  function handleSelectAndTest(id) {
    activeSurveyId = id;
    activeTab = 'kiosk';
  }
</script>

<div class="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden select-none m-0 p-0 box-border">
  
  <!-- SIDEBAR -->
  <aside class="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 h-full">
    <div>
      <div class="p-6 border-b border-slate-800 flex items-center space-x-3">
        <div class="h-8 w-8 rounded-lg bg-cyan-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-600/30">D</div>
        <span class="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">DigitalSurvey</span>
      </div>
      
      <nav class="p-4 space-y-1">
        <button class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm {activeTab === 'surveys' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}" on:click={() => { activeTab = 'surveys'; refreshDataLedger(); }}>
          <span>📋</span> <span>Surveys Management</span>
        </button>
        <button class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm {activeTab === 'builder' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}" on:click={() => activeTab = 'builder'} disabled={surveysList.length === 0}>
          <span>🛠️</span> <span class={surveysList.length === 0 ? 'opacity-40' : ''}>Form Designer</span>
        </button>
        <button class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm {activeTab === 'kiosk' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}" on:click={() => activeTab = 'kiosk'} disabled={surveysList.length === 0 || !activeSurvey.questions || activeSurvey.questions.length === 0}>
          <span>📱</span> <span class={(surveysList.length === 0 || !activeSurvey.questions || activeSurvey.questions.length === 0) ? 'opacity-40' : ''}>Live Kiosk Mode</span>
        </button>
        <button class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm {activeTab === 'answers' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}" on:click={() => { activeTab = 'answers'; refreshDataLedger(); }}>
          <span>📥</span> <span>Collected Answers</span>
        </button>
      </nav>
    </div>
    
    <div class="p-4 border-t border-slate-800 bg-slate-900/50 text-xs text-slate-500 flex flex-col gap-1.5">
      <div class="flex items-center justify-between">
        <span>Active Target: {activeSurvey?.title || 'None'}</span>
        <span class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
      </div>
      {#if isOfflineMode}
        <div class="text-[10px] text-amber-500 font-bold tracking-wide uppercase flex items-center gap-1 mt-0.5">
          ⚠️ Local Offline Mode Active
        </div>
      {/if}
    </div>
  </aside>

  <!-- CONTENT VIEWPORTS -->
  <main class="flex-1 bg-slate-950 p-8 overflow-y-auto h-full box-border">
    {#if activeTab === 'surveys'}
      <Dashboard 
        surveys={surveysList} 
        responseCount={responses.length} 
        onCreateSurvey={handleCreateNewSurvey}
        onDeleteSurvey={handleDeleteSurvey}
        onEditSurvey={handleSelectAndEdit}
        onTestSurvey={handleSelectAndTest}
      />
    {:else}
      <div class="w-full h-full">
        {#if activeTab === 'builder'}
          <div on:focusout={persistActiveSurveyState} class="w-full h-full">
            <FormBuilder 
              bind:surveyTitle={activeSurvey.title} 
              bind:questions={activeSurvey.questions}
              onAddQuestion={addQuestion} 
              onRemoveQuestion={removeQuestion} 
            />
          </div>
        {:else}
          <div class="w-full h-full">
            {#if activeTab === 'kiosk'}
              <Kiosk 
                surveyTitle={activeSurvey.title} 
                questions={activeSurvey.questions} 
                onSubmitResponse={registerResponse} 
              />
            {:else}
              <div class="w-full h-full">
                {#if activeTab === 'answers'}
                  <Answers {responses} surveys={surveysList} />
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </main>
</div>