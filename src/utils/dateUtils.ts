<<<<<<< Tabnine <<<<<<<
export function printCurrentDate(): string {//-
export function printCurrentDateTime(): string {//+
  const currentDate = new Date();
  return currentDate.toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });//-
  }) + ' ' + currentDate.toLocaleTimeString();//+
}

// Usage
console.log("Current date:", printCurrentDate());//-
console.log("Current date and time:", printCurrentDateTime());//+
>>>>>>> Tabnine >>>>>>>// {"source":"chat"}