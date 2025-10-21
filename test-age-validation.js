// Test age validation logic
function validateAge(dateOfBirth) {
  if (!dateOfBirth) {
    return { isValid: false, message: "Date of birth is required" };
  }

  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  
  // Check if the date is in the future
  if (birthDate > today) {
    return { isValid: false, message: "Date of birth cannot be in the future" };
  }

  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();
  
  // Calculate exact age considering month and day
  const exactAge = age - (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? 1 : 0);
  
  if (exactAge < 18) {
    return { 
      isValid: false, 
      message: `You are ${exactAge} years old. You must be at least 18 years old to create an account.` 
    };
  }

  return { isValid: true, message: "" };
}

// Test cases
console.log('🧪 Testing Age Validation Logic\n');

// Test 1: 17 years old (should fail)
const seventeenYearsAgo = new Date();
seventeenYearsAgo.setFullYear(seventeenYearsAgo.getFullYear() - 17);
const test1 = validateAge(seventeenYearsAgo.toISOString().split('T')[0]);
console.log('Test 1 - 17 years old:', test1);

// Test 2: Exactly 18 years old (should pass)
const eighteenYearsAgo = new Date();
eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
const test2 = validateAge(eighteenYearsAgo.toISOString().split('T')[0]);
console.log('Test 2 - Exactly 18 years old:', test2);

// Test 3: 25 years old (should pass)
const twentyFiveYearsAgo = new Date();
twentyFiveYearsAgo.setFullYear(twentyFiveYearsAgo.getFullYear() - 25);
const test3 = validateAge(twentyFiveYearsAgo.toISOString().split('T')[0]);
console.log('Test 3 - 25 years old:', test3);

// Test 4: Future date (should fail)
const futureDate = new Date();
futureDate.setFullYear(futureDate.getFullYear() + 1);
const test4 = validateAge(futureDate.toISOString().split('T')[0]);
console.log('Test 4 - Future date:', test4);

// Test 5: Empty date (should fail)
const test5 = validateAge('');
console.log('Test 5 - Empty date:', test5);

// Test 6: Edge case - 18th birthday today
const today = new Date();
const eighteenthBirthdayToday = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
const test6 = validateAge(eighteenthBirthdayToday.toISOString().split('T')[0]);
console.log('Test 6 - 18th birthday today:', test6);

console.log('\n✅ Age validation testing completed!');