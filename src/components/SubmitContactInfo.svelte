<script>

    let fullname, email;

    function saveContact(fullname, email) {
        console.log(fullname, email)
    }
  
    function submitButtonClick() {
        if (fullname && email) {
            let emailValid = validateEmail(email);
            let nameValid = validateFullName(fullname);
            if (emailValid && nameValid) {
                Swal.fire({
                    icon: 'success',
                    title: 'We will keep you posted!',
                    showConfirmButton: false,
                    timer: 1500
                });
                saveContact(fullname, email);
                fullname = undefined;
                email = undefined;
            } else if (emailValid && !nameValid) {
                Swal.fire({
                    icon: 'error',
                    title: 'Please state your full name.',
                    showConfirmButton: false,
                    timer: 1500
                });
                fullname = undefined;
            } else if (!emailValid && nameValid) {
                Swal.fire({
                    icon: 'error',
                    title: 'Please enter a valid email address.',
                    showConfirmButton: false,
                    timer: 1500
                });
                email = undefined;
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'State your full name and provide a valid email address.',
                    showConfirmButton: false,
                    timer: 3000
                });
                fullname = undefined;
                email = undefined;
            }
        }
    }

    function validateFullName(name) {
        return name.split(" ").length > 1;
    }
    function validateEmail(email) {
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }
</script>

<div class="
    w-10/12 max-w-sm mx-auto
    py-4 md:py-0 pl-0 md:pl-8
    flex-grow justify-center flex flex-col
">
    <form action="https://formspree.io/f/xzbyadvb" method="POST">
        <div class="bg-white px-6 py-8 rounded shadow-md text-black w-full">
            <h1 class="mb-8 text-2xl text-center">Want updates?</h1>
            <input
            bind:value={fullname}
            type="text"
            class="block border border-grey-light w-full p-3 rounded mb-4"
            name="fullname"
            placeholder="Name"
            >
            <input
            bind:value={email}
            type="text"
            class="block border border-grey-light w-full p-3 rounded mb-4"
            name="email"
            placeholder="Corporate email"
            >
            <button
            on:click={submitButtonClick}
            type="submit"
            class="w-full text-center py-3 rounded bg-red-400 text-white hover:bg-red-500 focus:outline-none my-1"
            >Submit</button>
        </div>
    </form>
</div>