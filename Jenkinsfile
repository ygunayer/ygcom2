pipeline {
    agent {
        docker { image 'node:8-alpine' }
    }

    stages {
        stage('Prebuild') {
            steps {
                sh 'npm install -g hexo-cli'
            }
        }

        stage('Build') {
            steps {
                checkout scm
                sh 'hexo generate'
            }
        }
    }
}
