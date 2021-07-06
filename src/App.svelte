<script>
  import Tailwind from './components/Tailwind.svelte';

  export let name;
</script>

<Tailwind />

<div class="flex flex-col">

  <!-- Big image of factory -->
  <div class="w-screen h-screen bg-rodinia-factory bg-cover bg-center bg-fixed">

    <!-- Rodinia logo smack in the middle -->
    <div class="bg-white mt-40 m-auto w-4/12">
      <img class="p-12 w-full object-contain" src="https://raw.githubusercontent.com/Rodinia-Generation/launching_soon_landing_page/main/public/img/logo.svg?token=ABQYDSSOH75F6WTF5TR6CELA5VZWY">
    </div>
  </div>
  
  <!-- left: your email
       right: short text -->
  <div class="w-screen flex flex-row bg-gray-100">
    
    <!-- left -->
    <div class="max-w-sm mx-auto flex-grow justify-center px-2 flex flex-col">
      <div class="bg-white px-6 py-8 rounded shadow-md text-black w-full">
          <h1 class="mb-8 text-2xl text-center">Want updates?</h1>
          <input type="text" class="block border border-grey-light w-full p-3 rounded mb-4" name="fullname" placeholder="Name">
          <input type="text" class="block border border-grey-light w-full p-3 rounded mb-4" name="email" placeholder="Corporate email">
          <button type="submit" class="w-full text-center py-3 rounded bg-red-400 text-white hover:bg-red-500 focus:outline-none my-1">Submit</button>
      </div>
    </div>

    <!-- right -->
    <div class="p-16 w-7/12 font-sans text-gray-700 font-light">
      <!-- <h2 class="text-4xl mb-4">Change is coming. Soon.</h2> -->
      <h2 class="text-4xl mb-4">We propose some changes.</h2>
      <p class="mb-3">
        Exploitation, pollution, opaque supply chains, and long production times.
        <b>That is today's fashion manufacturing industry</b>.
        The colored clothes you wear was most likely hand-dyed in unsafe conditions and sewn in a sweatshop, far, far away.
      </p>
      <p class="mb-3">
        This is a damn shame because <b>we can do better</b>.
        With modern technology, there is no lack of opportunity to do things in a safer, faster and cleaner way.
      </p>
      <p class="mb-3">
        <b>Rodinia Generation is developing the worlds first <em>Micro Fashion Factory</em></b>.
        The concept involves a big textile printer and an automatic cutter, robots and some patented artificial intelligence.
        It enables us to make anything from beautiful dresses to comfy bed linen using no water, no excess dye, two hands and very little time.
      </p>
    </div>

  </div>

</div>