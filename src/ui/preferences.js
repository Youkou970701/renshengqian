export function viewingPreferences(saved){
 return {
  automaticVersion:1,
  // Pre-hotfix saves cannot distinguish an opt-in from the old enabled default.
  automatic:saved?.automaticVersion===1&&saved?.automatic===true,
  duration:[15,30,60].includes(saved?.duration)?saved.duration:({5:15,10:30,20:60}[saved?.duration]??30),
 };
}
