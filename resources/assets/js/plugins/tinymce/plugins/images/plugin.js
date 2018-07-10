if ($('#uploader_modal').length > 0) {
    window.Admin.modals.uploaderModal = new Vue({
        el: '#uploader_modal',
        data: {
            target: '',
            upload: true,
            progress: {
                state: false,
                percents: 0,
                text: '',
                style: {
                    width: '0%'
                }
            },
            images: [],
            inputs: []
        },
        methods: {
            save: function (event) {
                var target = this.target;

                $.each(this.images, function (key, image) {
                    Admin.containers.images[target].images.push(image);
                });

                $('#uploader_modal').modal('hide');

                this.images.splice(0);
                this.upload = true;
            }
        }
    });
}

if ($('#edit_image_modal').length > 0) {
    window.Admin.modals.imageEditModal = new Vue({
        el: '#edit_image_modal',
        data: {
            target: '',
            image: {},
            inputs: []
        },
        methods: {
            save: function () {
                var image = this.image;

                $('#edit_image_modal input').each(function () {
                    image.properties[$(this).attr('name')] = $(this).val();
                });

                $('#edit_image_modal').modal('hide');
            }
        }
    });
}

tinymce.PluginManager.add('images', function(editor) {
    if ($(editor.getElement()).get(0).hasAttribute('hasImages')) {
        var $input = $('#uploader-area'),
            url = $input.attr('data-target'),
            name = editor.id,
            images = JSON.parse($('#' + name + '_images').attr('data-media'));

        Admin.containers.images[name] = new Vue({
            el: '#' + name + '_images',
            data: {
                target: name,
                images: images,
                inputs: JSON.parse($('#' + name + '_images').attr('data-properties'))
            },
            methods: {
                add: function (index) {
                    var alt = (this.images[index].properties.alt) ? this.images[index].properties.alt : '',
                        description = (this.images[index].properties.description) ? this.images[index].properties.description : '',
                        copyright = (this.images[index].properties.copyright) ? ' &copy; ' + this.images[index].properties.copyright : '',
                        tpl = _.unescape($('.content-image-tempalte').first().html());

                    var imageBlock = _.unescape(_.template(tpl)({
                        src: this.images[index].src,
                        alt: alt,
                        description: description,
                        copyright: copyright
                    }));

                    tinymce.get(this.target).editorManager.execCommand('mceInsertContent', false, imageBlock);
                },
                edit: function (index) {
                    var modalWindow = $('#edit_image_modal');

                    Admin.modals.imageEditModal.target = this.target;
                    Admin.modals.imageEditModal.image = this.images[index];
                    Admin.modals.imageEditModal.inputs = this.inputs;

                    modalWindow.modal();
                },
                remove: function (index) {
                    this.$delete(this.images, index);
                }
            }
        });

        editor.addButton('images', {
            title: 'Загрузить изображения',
            icon: 'image',
            onclick: function () {
                Admin.modals.uploaderModal.images.splice(0);
                Admin.modals.uploaderModal.upload = true;
                Admin.modals.uploaderModal.target = editor.id;
                Admin.modals.uploaderModal.inputs = JSON.parse($('#' + name + '_images').attr('data-properties'));

                var uploader = new plupload.Uploader({
                    browse_button: 'uploader-area',
                    drop_element: 'uploader-area',
                    url: url,
                    filters: {
                        mime_types: "image/*"
                    },
                    chunk_size: '500kb',
                    multi_selection: true,
                    file_data_name: name,
                    multipart_params: {
                        fieldName: name
                    },
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    }
                });

                uploader.init();

                uploader.bind('FilesAdded', function (up) {
                    Admin.modals.uploaderModal.progress.state = true;
                    Admin.modals.uploaderModal.upload = false;
                    up.start();
                });

                uploader.bind('UploadProgress', function (up) {
                    Admin.modals.uploaderModal.progress.percents = up.total.percent;
                    Admin.modals.uploaderModal.progress.text = up.total.percent + '% (' + (up.total.uploaded + 1) + ' из ' + up.files.length + ')';
                    Admin.modals.uploaderModal.progress.style.width = up.total.percent + '%';
                });

                uploader.bind('FileUploaded', function (up, file, response) {
                    response = JSON.parse(response.response);

                    var properties = {};
                    $.each(Admin.modals.uploaderModal.inputs, function (key, value) {
                        properties[value.name] = "";
                    });

                    Admin.modals.uploaderModal.images.push({
                        src: response.result.tempPath,
                        thumb: response.result.tempPath,
                        tempname: response.result.tempName,
                        filename: file.name,
                        properties: properties
                    });
                });

                uploader.bind('UploadComplete', function (up) {
                    Admin.modals.uploaderModal.progress.state = false;
                    Admin.modals.uploaderModal.progress.percents = 0;
                    Admin.modals.uploaderModal.progress.text = '';
                    Admin.modals.uploaderModal.progress.style.width = '0%';
                    up.destroy()
                });

                Admin.modals.uploaderModal.upload = true;
                $('#uploader_modal').modal();
            }
        });
    }
});
