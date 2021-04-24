/* globals SimpleMDE, vNotify */
document.addEventListener('DOMContentLoaded', () => {
    const simplemde = new SimpleMDE({ element: document.getElementById('md-editor') });

    document.getElementById('save-post').addEventListener('click', () => {
        let mdContent = simplemde.value();
        if(mdContent){
            mdContent = mdContent.trim();
        }

        // Check for title
        if(document.getElementById('post-title').value === ''){
            vNotify.error({ text: 'Post title cannot be blank', title: 'Error', position: 'topRight' });
            return;
        }
        fetch('/squido/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                postId: document.getElementById('post-id').value,
                permalink: document.getElementById('post-permalink').value,
                title: document.getElementById('post-title').value,
                description: document.getElementById('post-description').value,
                markdown: mdContent
            })
        })
        .then(async(response) => {
            if(!response.ok){
                const err = await response.json();
                vNotify.error({ text: `Error updating post: ${err.error}.`, title: 'Error', position: 'topRight' });
                return;
            }
            vNotify.success({ text: 'Successfully updated post', title: 'Success', position: 'topRight' });
        });
    });

    const htmlRegex = /<.+?>/g;
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    searchInput.addEventListener('keyup', async (e) => {
        if(searchInput.value.length > 2){
            // clear results
            searchResults.innerHTML = '';

            // Search
            const results = await fetch('/squido/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    searchTerm: searchInput.value
                })
            });

            const data = await results.json();
            // Display results
            let resultCount = 0;
            data.forEach((result) => {
                if(resultCount < 10){
                    const searchregex = new RegExp(`(${searchInput.value})`);
                    const textsearch = result.body.replace(htmlRegex, '').search(searchregex);
                    const foundtext = result.body.replace(htmlRegex, '').substring(textsearch - 40, (textsearch + searchInput.value.length) + 40);
                    const highlightedText = foundtext.replace(searchInput.value, `<span class="text-squido-highlight">${searchInput.value}</span>`);
                    const contents = `<p><span class="result-title"> ${result.title}</span><br/><small>${highlightedText}</small></p></a>`;
                    searchResults.innerHTML = `${searchResults.innerHTML}<a class='list-group-item search-result-item' href='/squido/${result.id}'>${contents}</a>`;
                    resultCount++;
                }
            });
        }else{
            searchResults.innerHTML = '';
        }

        // When the clear "x" is clicked
        searchInput.addEventListener('search', (e) => {
            if(searchInput.value === ''){
                // clear results
                searchResults.innerHTML = '';
            }
        });
    });
}, false);
