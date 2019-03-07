
$(document).ready(function(){

    $("#portfolioBtn").click(function() {
        $([document.documentElement, document.body]).animate({
            scrollTop: $("#portfolio").offset().top - 50
        }, 350);
    });

    $("#aboutBtn").click(function() {
        $([document.documentElement, document.body]).animate({
            scrollTop: $("#about").offset().top - 50
        }, 350);
    });

    $("#contactBtn").click(function() {
        $([document.documentElement, document.body]).animate({
            scrollTop: $("#contact").offset().top - 50
        }, 350);
    });
}); 