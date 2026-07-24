const carousels = document.querySelectorAll(".actor-carousel");

carousels.forEach((carousel) => {
  const carouselTrack = carousel.querySelector(".actor-carousel-track");

  const carouselViewport = carousel.querySelector(".actor-carousel-viewport");

  const previousButton = carousel.querySelector(".previous-actors-button");

  const nextButton = carousel.querySelector(".next-actors-button");

  const actorCards  = carouselTrack.querySelectorAll(".actor-carousel-card");
  

  let currentPage = 0;

  function getCardsPerPage() {
    if (window.innerWidth <= 768) {
      return 1;
    }

    if (window.innerWidth <= 992) {
      return 3;
    }

    return 4;
  }

  function getTotalPages() {
    const cardsPerPage = getCardsPerPage();

    return Math.ceil(actorCards .length / cardsPerPage);
  }

  function updateCarousel() {
    if (actorCards .length === 0) {
      previousButton.hidden = true;
      nextButton.hidden = true;
      return;
    }

    const cardsPerPage = getCardsPerPage();
    const totalPages = getTotalPages();

    if (currentPage >= totalPages) {
      currentPage = totalPages - 1;
    }

    const firstCard = actorCards [0];

    const cardWidth = firstCard.getBoundingClientRect().width;

    const trackStyles = window.getComputedStyle(carouselTrack);

    const gap = parseFloat(trackStyles.columnGap) || 0;

    const distanceToMove = cardsPerPage * (cardWidth + gap);

    const movement = currentPage * distanceToMove;

    carouselTrack.style.transform = `translateX(-${movement}px)`;

    previousButton.hidden = currentPage === 0;

    nextButton.hidden = currentPage >= totalPages - 1;
  }

  function showNextPage() {
    const totalPages = getTotalPages();

    if (currentPage < totalPages - 1) {
      currentPage++;
      updateCarousel();
    }
  }

  function showPreviousPage() {
    if (currentPage > 0) {
      currentPage--;
      updateCarousel();
    }
  }

  nextButton.addEventListener("click", showNextPage);

  previousButton.addEventListener("click", showPreviousPage);

  let touchStartX = 0;
  let touchStartY = 0;

  let touchEndX = 0;
  let touchEndY = 0;

  carouselViewport.addEventListener("touchstart", function (event) {
    touchStartX = event.touches[0].clientX;

    touchStartY = event.touches[0].clientY;
  });

  carouselViewport.addEventListener("touchend", function (event) {
    touchEndX = event.changedTouches[0].clientX;

    touchEndY = event.changedTouches[0].clientY;

    handleSwipe();
  });

  function handleSwipe() {
    const horizontalDistance = touchEndX - touchStartX;

    const verticalDistance = touchEndY - touchStartY;

    const minimumSwipeDistance = 50;

    const isHorizontalSwipe =
      Math.abs(horizontalDistance) > Math.abs(verticalDistance);

    if (
      !isHorizontalSwipe ||
      Math.abs(horizontalDistance) < minimumSwipeDistance
    ) {
      return;
    }

    if (horizontalDistance < 0) {
      showNextPage();
    }

    if (horizontalDistance > 0) {
      showPreviousPage();
    }
  }

  window.addEventListener("resize", function () {
    currentPage = 0;
    updateCarousel();
  });

  updateCarousel();
});
