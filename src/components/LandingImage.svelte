<script>
    import confetti from 'canvas-confetti';

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const launchDate = new Date("Oct 7, 2021 12:00:00");
    const launchDateTS = launchDate.getTime();

    let timeLeft = computeTimeLeft();
    let showCounter = true;
    let bgCounter = 1;

    setInterval(() => {
        if (showCounter)
            timeLeft = computeTimeLeft();
    }, 1000);

    function computeTimeLeft() {
        const now = new Date().getTime();
        const timeleft = launchDateTS - now;
            
        // Calculating the days, hours, minutes and seconds left
        const days = Math.floor(timeleft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeleft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeleft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeleft % (1000 * 60)) / 1000);

        let timeString = "Launching in ";
        if (days > 0)
            timeString += doubleDigits(days) + ":"
        if (timeString != "Launching in ")
            timeString += doubleDigits(hours) + ":"
        else if (hours > 0)
            timeString += doubleDigits(hours) + ":"
        if (timeString != "Launching in ")
            timeString += doubleDigits(minutes) + ":"
        else if (minutes > 0)
            timeString += doubleDigits(minutes) + ":"
        if (timeString != "Launching in ")
            timeString += doubleDigits(seconds)
        else if (seconds > 0)
            timeString += doubleDigits(seconds)
        else {
            timeString = ""
            confetti({
                particleCount: Math.random() * 800 + 200,
                angle: Math.random() * 180,
                spread: Math.random() * 270,
                gravity: Math.random() * 0.5 + 0.5,
                origin: {
                    x: Math.random() * 0.6 + 0.2,
                    y: Math.random() * 0.6 + 0.2
                }
            })
        }

        return timeString;
    }

    function handleClick() {
        showCounter = !showCounter;
        if (showCounter)
            timeLeft = computeTimeLeft();
        else
            timeLeft = "Launching on " + monthNames[launchDate.getMonth()] + " " + launchDate.getDate() + ", " + launchDate.getFullYear();
    }

    function doubleDigits(number) {
        return number.toLocaleString('en-US', {
            minimumIntegerDigits: 2,
            useGrouping: false
        })
    }

    function bgClick() {
        bgCounter += 1;
        bgCounter %= 3;
    }
</script>

<div
    class={`w-screen h-screen bg-cover bg-center bg-fixed bg-rodinia-factory${bgCounter+1}`}
    on:click={bgClick}
>
    <div class="flex flex-col"> <!--  "> -->
        <img class="p-12 bg-white mt-40 m-auto w-10/12 sm:w-5/12 lg:w-4/12 xl:w-3/12" src="img/logo.svg">
        <div class="
            m-auto -mt-7
            text-xs md:text-sm text-center
            cursor-pointer
        ">
            <p on:click={handleClick} class="text-gray-600 select-none">{timeLeft}</p>
        </div>
    </div>
</div>