<script>

    let fullname, companyAndTitle, email;
    let inputInvalid;
    
    $: {
        if (fullname && companyAndTitle && email) {
            let emailValid = validateEmail(email);
            let companyAndTitleValid = validateName(companyAndTitle);
            let nameValid = validateName(fullname);
            if (emailValid && companyAndTitleValid && nameValid)
                inputInvalid = false;
            else
                inputInvalid = true;
        } else
            inputInvalid = true;
    }

    function validateName(name) {
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
        <div class="bg-white px-8 py-8 rounded shadow-md text-black w-full">
            <h1 class="mb-8 text-2xl text-center">Be the first to know</h1>
            <input
            bind:value={fullname}
            type="text"
            class="block border border-grey-light w-full p-2 rounded mb-2"
            name="fullname"
            placeholder="Name"
            >
            <input
            bind:value={companyAndTitle}
            type="text"
            class="block border border-grey-light w-full p-2 rounded mb-2"
            name="companyAndTitle"
            placeholder="Company and title"
            >
            <input
            bind:value={email}
            type="text"
            class="block border border-grey-light w-full p-2 rounded mb-2"
            name="email"
            placeholder="Corporate email"
            >
            <button
            type="submit"
            class="w-full text-center py-2 rounded bg-rg-milky-blue-light text-white hover:bg-rg-milky-blue focus:outline-none my-1"
            disabled={inputInvalid}
            >Submit</button>
        </div>
    </form>
</div>