// timeline.js - Script pour la page timeline
document.addEventListener('DOMContentLoaded', function () {
  // ==================== GESTION DE L'UPLOAD D'IMAGE/VIDÉO ====================
  const uploadMediaBtn = document.getElementById('uploadMediaBtn')
  const mediaInput = document.getElementById('mediaInput')
  const tweetForm = document.getElementById('tweetForm')
  const mediaPreview = document.getElementById('mediaPreview')
  const previewImg = document.getElementById('previewImg')
  const previewVideo = document.getElementById('previewVideo')
  const removeMediaBtn = document.getElementById('removeMedia')
  let currentMediaFile = null
  let currentMediaType = null

  if (uploadMediaBtn && mediaInput) {
    uploadMediaBtn.addEventListener('click', function (e) {
      e.preventDefault()
      e.stopPropagation()
      mediaInput.click()
    })

    mediaInput.addEventListener('change', function () {
      if (this.files && this.files[0]) {
        currentMediaFile = this.files[0]
        currentMediaType = this.files[0].type
        const reader = new FileReader()

        reader.onload = function (e) {
          if (currentMediaType.startsWith('image/')) {
            previewImg.style.display = 'block'
            previewVideo.style.display = 'none'
            previewImg.src = e.target.result
          } else if (currentMediaType.startsWith('video/')) {
            previewImg.style.display = 'none'
            previewVideo.style.display = 'block'
            previewVideo.src = e.target.result
          }
          mediaPreview.style.display = 'block'
        }
        reader.readAsDataURL(this.files[0])
      }
    })

    if (removeMediaBtn) {
      removeMediaBtn.addEventListener('click', function () {
        mediaInput.value = ''
        mediaPreview.style.display = 'none'
        previewImg.src = ''
        previewVideo.src = ''
        previewImg.style.display = 'none'
        previewVideo.style.display = 'none'
        currentMediaFile = null
        currentMediaType = null
      })
    }
  }

  // ==================== SOUMISSION DU FORMULAIRE ====================
  if (tweetForm) {
    tweetForm.addEventListener('submit', async function (e) {
      e.preventDefault()

      const textarea = document.querySelector('#tweetForm textarea')
      const content = textarea ? textarea.value : ''

      // Autoriser la publication avec seulement un média
      if ((!content || content.trim().length === 0) && !currentMediaFile) {
        showFlashMessage('error', 'Veuillez ajouter du texte ou un média')
        return
      }

      const formData = new FormData()
      if (content && content.trim().length > 0) {
        formData.append('content', content)
      } else {
        formData.append('content', '')
      }

      if (currentMediaFile) {
        formData.append('media', currentMediaFile)
      }

      const submitBtn = document.getElementById('tweet-post')
      if (submitBtn) {
        submitBtn.disabled = true
        submitBtn.textContent = 'Envoi...'
      }

      try {
        const csrfToken = document.querySelector('input[name="_csrf"]')
        const response = await fetch('/tweets', {
          method: 'POST',
          headers: {
            'X-CSRF-TOKEN': csrfToken ? csrfToken.value : '',
          },
          body: formData,
        })

        if (response.ok) {
          if (textarea) textarea.value = ''
          if (mediaInput) mediaInput.value = ''
          if (mediaPreview) mediaPreview.style.display = 'none'
          if (previewImg) previewImg.src = ''
          if (previewVideo) previewVideo.src = ''
          currentMediaFile = null
          currentMediaType = null

          showFlashMessage('success', 'Tweet publié avec succès !')
          setTimeout(() => {
            window.location.reload()
          }, 1500)
        } else {
          const error = await response.json()
          showFlashMessage('error', error.message || 'Erreur lors de la publication')
          if (submitBtn) {
            submitBtn.disabled = false
            submitBtn.textContent = 'Post'
          }
        }
      } catch (error) {
        console.error('Erreur:', error)
        showFlashMessage('error', 'Erreur de connexion')
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.textContent = 'Post'
        }
      }
    })
  }

  // ==================== MENU UTILISATEUR ====================
  const menuBtn = document.querySelector('.user-menu')
  const popupMenu = document.querySelector('.popup-menu')

  if (menuBtn && popupMenu) {
    menuBtn.addEventListener('click', function (e) {
      e.stopPropagation()
      const isHidden = popupMenu.getAttribute('hidden') !== null
      if (isHidden) {
        popupMenu.removeAttribute('hidden')
      } else {
        popupMenu.setAttribute('hidden', '')
      }
    })

    document.addEventListener('click', function (e) {
      if (!menuBtn.contains(e.target) && !popupMenu.contains(e.target)) {
        popupMenu.setAttribute('hidden', '')
      }
    })
  }

  // ==================== FONCTIONS POUR LES MODALES ====================
  window.openRetweetModal = function (tweetId) {
    const modal = document.getElementById('retweetModal')
    const form = document.getElementById('retweetForm')
    if (modal && form) {
      form.action = '/tweets/' + tweetId + '/retweet'
      modal.style.display = 'flex'
    }
  }

  window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId)
    if (modal) {
      modal.style.display = 'none'
    }
    const retweetFormElem = document.getElementById('retweetForm')
    if (retweetFormElem) retweetFormElem.reset()
  }

  // Fermeture des modales
  const closeModalBtns = document.querySelectorAll('.close-modal')
  closeModalBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal').forEach((modal) => {
        modal.style.display = 'none'
      })
      document.querySelectorAll('.modal form').forEach((form) => {
        form.reset()
      })
    })
  })

  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none'
        const form = modal.querySelector('form')
        if (form) form.reset()
      }
    })
  })

  // ==================== GESTION DES RETWEETS ====================
  const retweetFormElem = document.getElementById('retweetForm')
  if (retweetFormElem) {
    retweetFormElem.addEventListener('submit', async function (e) {
      e.preventDefault()
      const formData = new FormData(this)
      const url = this.action

      const submitBtn = this.querySelector('button[type="submit"]')
      if (submitBtn) {
        submitBtn.disabled = true
        submitBtn.textContent = 'Envoi...'
      }

      try {
        const csrfToken = document.querySelector('input[name="_csrf"]')
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'X-CSRF-TOKEN': csrfToken ? csrfToken.value : '',
          },
          body: formData,
        })

        if (response.ok) {
          document.getElementById('retweetModal').style.display = 'none'
          showFlashMessage('success', 'Retweet effectué !')
          setTimeout(() => {
            window.location.reload()
          }, 1500)
        } else {
          const error = await response.json()
          showFlashMessage('error', error.message || 'Erreur lors du retweet')
          if (submitBtn) {
            submitBtn.disabled = false
            submitBtn.textContent = 'Retweeter'
          }
        }
      } catch (error) {
        console.error('Erreur:', error)
        showFlashMessage('error', 'Erreur de connexion')
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.textContent = 'Retweeter'
        }
      }
    })
  }

  // ==================== GESTION DES LIKES ====================
  document.querySelectorAll('.like-form').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const formData = new FormData(form)
      const url = form.action

      const btn = form.querySelector('.interaction-btn')
      const countSpan = btn.querySelector('.interaction-count')

      try {
        const csrfToken = document.querySelector('input[name="_csrf"]')
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'X-CSRF-TOKEN': csrfToken ? csrfToken.value : '',
          },
          body: formData,
        })

        if (response.ok) {
          const result = await response.json()

          if (result.liked) {
            btn.classList.add('liked')
          } else {
            btn.classList.remove('liked')
          }

          if (countSpan) {
            countSpan.textContent = result.likesCount
          }
        }
      } catch (error) {
        console.error('Erreur:', error)
      }
    })
  })

  // ==================== MESSAGES FLASH ====================
  window.showFlashMessage = function (type, message) {
    const existingFlashes = document.querySelectorAll('.tweet-flash')
    existingFlashes.forEach((flash) => flash.remove())

    const flash = document.createElement('div')
    flash.className = `tweet-flash ${type}`

    const iconSvg =
      type === 'success'
        ? `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`
        : `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`

    flash.innerHTML = `
            <div class="tweet-flash-icon">${iconSvg}</div>
            <div class="tweet-flash-content"><p>${message}</p></div>
            <button class="tweet-flash-close">×</button>
        `

    const centerContainer = document.getElementById('centerContainer')
    const tabs = document.querySelector('.tabs')

    if (centerContainer && tabs) {
      centerContainer.insertBefore(flash, tabs.nextSibling)
    } else {
      document.body.insertBefore(flash, document.body.firstChild)
    }

    const closeBtn = flash.querySelector('.tweet-flash-close')
    closeBtn.addEventListener('click', () => flash.remove())

    setTimeout(() => {
      if (flash && document.body.contains(flash)) {
        flash.remove()
      }
    }, 3000)
  }

  // ==================== MODALE POSTER UN TWEET ====================
  const openModalBtn = document.getElementById('openTweetModal')
  const tweetModal = document.getElementById('tweetModal')
  if (openModalBtn && tweetModal) {
    openModalBtn.addEventListener('click', () => {
      tweetModal.style.display = 'flex'
    })
  }

  const modalTweetForm = document.getElementById('modalTweetForm')
  if (modalTweetForm) {
    modalTweetForm.addEventListener('submit', async function (e) {
      e.preventDefault()
      const formData = new FormData(this)
      const content = formData.get('content')

      if (!content || content.trim().length === 0) {
        showFlashMessage('error', 'Le tweet ne peut pas être vide')
        return
      }

      const submitBtn = this.querySelector('button[type="submit"]')
      if (submitBtn) {
        submitBtn.disabled = true
        submitBtn.textContent = 'Envoi...'
      }

      try {
        const csrfToken = document.querySelector('input[name="_csrf"]')
        const response = await fetch('/tweets', {
          method: 'POST',
          headers: {
            'X-CSRF-TOKEN': csrfToken ? csrfToken.value : '',
          },
          body: formData,
        })

        if (response.ok) {
          document.getElementById('tweetModal').style.display = 'none'
          showFlashMessage('success', 'Tweet publié avec succès !')
          setTimeout(() => {
            window.location.reload()
          }, 1500)
        } else {
          if (submitBtn) {
            submitBtn.disabled = false
            submitBtn.textContent = 'Poster'
          }
        }
      } catch (error) {
        console.error('Erreur:', error)
        showFlashMessage('error', 'Erreur lors de la publication')
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.textContent = 'Poster'
        }
      }
    })
  }
})

// ==================== MODALE DES COMMENTAIRES ====================
let currentTweetId = null

async function openRepliesModal(tweetId, buttonElement) {
  currentTweetId = tweetId

  try {
    const csrfToken = document.querySelector('input[name="_csrf"]')
    const response = await fetch(`/tweets/${tweetId}/replies`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-CSRF-TOKEN': csrfToken ? csrfToken.value : '',
      },
    })

    if (response.ok) {
      const data = await response.json()

      // Afficher le tweet original depuis le DOM
      const tweetItem = buttonElement.closest('.tweet-item')
      const tweetContent = tweetItem.querySelector('.tweet-content p')?.innerText || ''
      const tweetUser = tweetItem.querySelector('.tweet-user-info strong')?.innerText || ''
      const tweetUsername = tweetItem.querySelector('.tweet-user-info .username')?.innerText || ''
      const tweetAvatar = tweetItem.querySelector('.tweet-header .avatar-circle')?.innerText || 'U'
      const tweetImage = tweetItem.querySelector('.tweet-image')?.src || null
      const tweetVideo = tweetItem.querySelector('.tweet-video')?.src || null

      displayOriginalTweetFromDOM(
        tweetContent,
        tweetUser,
        tweetUsername,
        tweetAvatar,
        tweetImage,
        tweetVideo
      )
      displayReplies(data.replies || [])

      const modal = document.getElementById('repliesModal')
      modal.style.display = 'flex'
    } else {
      displayReplies([])
      const modal = document.getElementById('repliesModal')
      modal.style.display = 'flex'
    }
  } catch (error) {
    console.error('Erreur:', error)
    displayReplies([])
    const modal = document.getElementById('repliesModal')
    modal.style.display = 'flex'
  }
}

function displayOriginalTweetFromDOM(content, userName, username, avatar, image, video) {
  const container = document.getElementById('originalTweetPreview')
  container.innerHTML = `
        <div style="display: flex; gap: 12px;">
            <div class="avatar-circle" style="width: 48px; height: 48px; border-radius: 50%; background: #1d9bf0; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">
                ${avatar}
            </div>
            <div style="flex: 1;">
                <div>
                    <strong>${userName}</strong>
                    <span class="username">${username}</span>
                </div>
                <p style="margin: 8px 0 0 0;">${content || ''}</p>
                ${image ? `<img src="${image}" style="max-width: 100%; border-radius: 16px; margin-top: 8px;" />` : ''}
                ${video ? `<video src="${video}" controls style="max-width: 100%; border-radius: 16px; margin-top: 8px;"></video>` : ''}
            </div>
        </div>
    `
}

function displayReplies(replies) {
  const container = document.getElementById('repliesList')

  if (!replies || replies.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; color: #6b7280; padding: 20px;">Aucune réponse pour le moment. Soyez le premier à commenter !</p>'
    return
  }

  container.innerHTML = replies
    .map(
      (reply) => `
        <div class="reply-item-modal" data-reply-id="${reply.id}">
            <div class="avatar-circle" style="width: 40px; height: 40px; border-radius: 50%; background: #1d9bf0; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                ${reply.user.name ? reply.user.name.charAt(0).toUpperCase() : reply.user.username.charAt(0).toUpperCase()}
            </div>
            <div class="reply-content-modal">
                <div>
                    <strong>${reply.user.name || reply.user.username}</strong>
                    <span class="username">@${reply.user.username}</span>
                    <span class="time">· ${new Date(reply.createdAt).toLocaleString('fr-FR')}</span>
                </div>
                <p>${reply.content}</p>
            </div>
            ${
              reply.userId === window.userId
                ? `
                <button class="delete-reply-modal" onclick="deleteReply(${reply.id})" title="Supprimer">
                    <img src="/assets/icon/delete.svg" alt="Supprimer" />
                </button>
            `
                : ''
            }
        </div>
    `
    )
    .join('')
}

async function deleteReply(replyId) {
  if (!confirm('Supprimer ce commentaire ?')) return

  try {
    const csrfToken = document.querySelector('input[name="_csrf"]')
    const response = await fetch(`/tweets/${replyId}/delete`, {
      method: 'POST',
      headers: {
        'X-CSRF-TOKEN': csrfToken ? csrfToken.value : '',
      },
    })

    if (response.ok) {
      showFlashMessage('success', 'Commentaire supprimé')
      // Recharger les commentaires
      if (currentTweetId) {
        const response = await fetch(`/tweets/${currentTweetId}/replies`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-CSRF-TOKEN': csrfToken ? csrfToken.value : '',
          },
        })
        if (response.ok) {
          const data = await response.json()
          displayReplies(data.replies || [])
        }
      }
    } else {
      showFlashMessage('error', 'Erreur lors de la suppression')
    }
  } catch (error) {
    console.error('Erreur:', error)
    showFlashMessage('error', 'Erreur de connexion')
  }
}

// Soumission du commentaire
document.addEventListener('DOMContentLoaded', function () {
  const submitReplyBtn = document.getElementById('submitReplyBtn')
  const replyContent = document.getElementById('replyContent')

  if (submitReplyBtn) {
    submitReplyBtn.addEventListener('click', async function () {
      const content = replyContent.value.trim()

      if (!content) {
        showFlashMessage('error', 'Veuillez écrire un commentaire')
        return
      }

      submitReplyBtn.disabled = true
      submitReplyBtn.textContent = 'Envoi...'

      const formData = new FormData()
      formData.append('content', content)

      try {
        const csrfToken = document.querySelector('input[name="_csrf"]')
        const response = await fetch(`/tweets/${currentTweetId}/reply`, {
          method: 'POST',
          headers: {
            'X-CSRF-TOKEN': csrfToken ? csrfToken.value : '',
          },
          body: formData,
        })

        if (response.ok) {
          replyContent.value = ''
          showFlashMessage('success', 'Commentaire publié !')
          // Recharger les commentaires
          const res = await fetch(`/tweets/${currentTweetId}/replies`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'X-CSRF-TOKEN': csrfToken ? csrfToken.value : '',
            },
          })
          if (res.ok) {
            const data = await res.json()
            displayReplies(data.replies || [])
          }
        } else {
          const error = await response.json()
          showFlashMessage('error', error.message || 'Erreur lors de la publication')
        }
      } catch (error) {
        console.error('Erreur:', error)
        showFlashMessage('error', 'Erreur de connexion')
      } finally {
        submitReplyBtn.disabled = false
        submitReplyBtn.textContent = 'Répondre'
      }
    })
  }
})

window.openRepliesModal = openRepliesModal
window.deleteReply = deleteReply
