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
                permalink: document.getElementById('post-permalink').value,
                title: document.getElementById('post-title').value,
                markdown: mdContent
            })
        })
        .then((response) => {
            if(!response.ok){
                vNotify.error({ text: 'Error updating post. Check logs.', title: 'Error', position: 'topRight' });
                return;
            }
            vNotify.success({ text: 'Successfully updated post', title: 'Success', position: 'topRight' });
        });
    });
}, false);
