<script>
  import Tailwind from './components/Tailwind.svelte';
  import LandingImage from './components/LandingImage.svelte';
  import SubmitContactInfo from './components/SubmitContactInfo.svelte';
  import InfoBox from './components/InfoBox.svelte';
  import Footer from './components/Footer.svelte'
  import Swal from 'sweetalert2';
</script>

<!-- Global Tailwind styling -->
<Tailwind />

<div class="flex flex-col bg-gray-100 font-sans text-gray-700 font-light">

  <!-- Top section: image of factory + logo -->
  <LandingImage />

  <div class="p-8 md:p-16 pb-4 md:pb-8">

    <!-- Info section: contact submission (left) + info box (right) -->
    <div class="flex flex-col md:flex-row w-full bg-gray-100">
      <InfoBox />            <!-- right -->
      <SubmitContactInfo />  <!-- left -->
    </div>
    
    <!-- Footer -->
    <Footer />
    
  </div>
</div>