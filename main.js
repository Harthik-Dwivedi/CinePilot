document.addEventListener('DOMContentLoaded', function() {
  // Dark/Light mode toggle
  const themeToggle = document.getElementById('theme-toggle');
  const body = document.body;
  
  // Check for saved theme preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    body.classList.add(savedTheme);
    updateThemeIcon(savedTheme === 'dark-mode');
  }
  
  // Theme toggle click handler
  themeToggle.addEventListener('click', function() {
    const isDarkMode = body.classList.contains('dark-mode');
    
    // Remove both classes first
    body.classList.remove('light-mode', 'dark-mode');
    
    // Add the new theme class
    if (isDarkMode) {
      body.classList.add('light-mode');
      localStorage.setItem('theme', 'light-mode');
    } else {
      body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark-mode');
    }
    
    // Update the icon
    updateThemeIcon(!isDarkMode);
  });
  
  // Function to update theme icon
  function updateThemeIcon(isDarkMode) {
    const icon = themeToggle.querySelector('i');
    if (isDarkMode) {
      icon.classList.remove('bi-moon-fill');
      icon.classList.add('bi-sun-fill');
    } else {
      icon.classList.remove('bi-sun-fill');
      icon.classList.add('bi-moon-fill');
    }
  }

  // Password confirmation validation
  const passwordField = document.getElementById('password');
  const confirmPasswordField = document.getElementById('confirmPassword');
  if (passwordField && confirmPasswordField) {
    confirmPasswordField.addEventListener('input', function() {
      if (passwordField.value !== confirmPasswordField.value) {
        confirmPasswordField.setCustomValidity("Passwords don't match");
      } else {
        confirmPasswordField.setCustomValidity('');
      }
    });
    passwordField.addEventListener('input', function() {
      if (passwordField.value !== confirmPasswordField.value) {
        confirmPasswordField.setCustomValidity("Passwords don't match");
      } else {
        confirmPasswordField.setCustomValidity('');
      }
    });
  }
});