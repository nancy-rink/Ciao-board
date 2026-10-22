// Start-up: runs last, once everything above is defined. Anything that needs all the files (the style list, the art,
// the remote) starts here, not from a timer in its own file: a timer can fire between two files loading.
frBoot();
ready=true; whenReady.splice(0).forEach(fn=>fn());
// Start: blank board, then flip in the current message
tiles.forEach(t=>{paint(t.u,0);paint(t.d,0)});
updateCount();
if(!new URLSearchParams(location.search).has('remote'))setTimeout(()=>{const m=store.get('fb.mode','');if(sched.on)startSchedule();else if(m==='calendar')startCalendar();else if(m==='news')startNews();else if(m==='art'&&ART_BY[artCur])startArt(artCur);else if(m==='clock')startClock();else if(m==='weather')startWeather();else if(m==='surf')startSurf();else if(m==='rotating'&&saved.length)$('rotateBtn').click();else send(getMsg())},300);
