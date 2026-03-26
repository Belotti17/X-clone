window.openSignup = function () {
  document.getElementById('overlay').style.display = 'flex'
}

window.closeSignup = function () {
  document.getElementById('overlay').style.display = 'none'
}

window.openLogin = function () {
  document.getElementById('popup-x').classList.add('active')
}

window.closeLogin = function () {
  document.getElementById('popup-x').classList.remove('active')
}
